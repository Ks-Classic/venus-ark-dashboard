#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { generateWeeklyRecruitmentReport } from '../lib/analytics/weekly-aggregation';
import { upsertWeeklyReport } from '../lib/firestore/weekly_reports';
import { JobCategory } from '../lib/types/enums';
import { getWeekNumberFromDate, getYearWeekNumber } from '../lib/date';

// 環境変数を読み込み
dotenv.config({ path: '.env.local' });

/**
 * 特定の週の全職種レポートを生成してFirestoreに保存する
 */
async function generateAndSaveWeeklyReports(reportYear: number, reportMonth: number, reportWeekInMonth: number): Promise<void> {
  console.log(`=== ${reportYear}年${reportMonth}月第${reportWeekInMonth}週のレポート生成開始 ===`);
  
  // lib/firebase/admin を dotenv の後に動的にインポート
  const { initializeFirebaseAdmin } = await import('../lib/firebase/admin');
  
  // Firebase Admin SDK を初期化
  initializeFirebaseAdmin();
  
  const jobCategories: JobCategory[] = [JobCategory.SNS_OPERATION, JobCategory.VIDEO_CREATOR, JobCategory.AI_WRITER, JobCategory.PHOTOGRAPHY_STAFF];
  
  for (const jobCategory of jobCategories) {
    try {
      console.log(`\n--- ${jobCategory} のレポート生成中 ---`);
      
      // 週次レポートを生成
      const report = await generateWeeklyRecruitmentReport(reportYear, reportMonth, reportWeekInMonth, jobCategory);
      
      console.log(`${jobCategory} レポート生成完了:`, {
        期間: `${report.startDate} 〜 ${report.endDate}`,
        応募数: report.recruitmentMetrics?.applications || 0,
        書類提出数: report.recruitmentMetrics?.documents || 0,
        面接実施数: report.recruitmentMetrics?.interviews || 0,
        採用者数: report.recruitmentMetrics?.hires || 0,
      });
      
      // Firestoreに保存
      await upsertWeeklyReport(report);
      console.log(`${jobCategory} レポートをFirestoreに保存完了`);
      
    } catch (error) {
      console.error(`${jobCategory} のレポート生成に失敗:`, error);
    }
  }
  
  console.log(`\n=== ${reportYear}年${reportMonth}月第${reportWeekInMonth}週のレポート生成完了 ===`);
}

/**
 * 現在の週のレポートを生成する
 */
async function generateCurrentWeekReports(): Promise<void> {
  const today = new Date();
  const { year, month, weekInMonth } = getWeekNumberFromDate(today);
  await generateAndSaveWeeklyReports(year, month, weekInMonth);
}

/**
 * 指定された週のレポートを生成する
 */
async function generateSpecificWeekReports(year: number, month: number, weekInMonth: number): Promise<void> {
  await generateAndSaveWeeklyReports(year, month, weekInMonth);
}

/**
 * 複数週のレポートを一括生成する
 */
async function generateMultipleWeeksReports(
  startYear: number, 
  startMonth: number,
  startWeek: number, 
  endYear: number, 
  endMonth: number,
  endWeek: number
): Promise<void> {
  console.log(`=== 複数週レポート生成: ${startYear}/${startMonth}/${startWeek} 〜 ${endYear}/${endMonth}/${endWeek} ===`);
  
  // Note: This is a simplified loop and might not handle all date edge cases perfectly.
  let currentYear = startYear;
  let currentMonth = startMonth;
  let currentWeek = startWeek;

  while (currentYear < endYear || 
         (currentYear === endYear && currentMonth < endMonth) ||
         (currentYear === endYear && currentMonth === endMonth && currentWeek <= endWeek)) {
    
    await generateAndSaveWeeklyReports(currentYear, currentMonth, currentWeek);
    
    // This logic is simplified. A robust solution would use date-fns or similar.
    currentWeek++;
    // A more complex logic is needed to handle month/year changes correctly.
    // For now, we assume we don't cross month boundaries in this simple loop.
    // This part needs to be improved for production use.
  }
  
  console.log('=== 複数週レポート生成完了 ===');
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  try {
    if (args.length === 0) {
      console.log('現在の週のレポートを生成します...');
      await generateCurrentWeekReports();
    } else if (args.length === 3) {
      const year = parseInt(args[0]);
      const month = parseInt(args[1]);
      const week = parseInt(args[2]);
      
      if (isNaN(year) || isNaN(month) || isNaN(week)) {
        throw new Error('有効な 年 月 週 を指定してください');
      }
      
      console.log(`${year}年${month}月第${week}週のレポートを生成します...`);
      await generateSpecificWeekReports(year, month, week);
    } else {
      console.log('使用方法:');
      console.log('  npm run generate:report              # 現在の週');
      console.log('  npm run generate:report 2025 7 3     # 特定の週 (年 月 週)');
      process.exit(1);
    }
    
    console.log('\n✅ 週次レポート生成が完了しました');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ レポート生成中にエラーが発生しました:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}