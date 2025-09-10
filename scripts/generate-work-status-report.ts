#!/usr/bin/env ts-node
/**
 * 稼働状況レポートを生成するスクリプト
 * 
 * 使用方法:
 * ts-node --require tsconfig-paths/register scripts/generate-work-status-report.ts [year] [month] [weekInMonth]
 * 
 * 例:
 * ts-node --require tsconfig-paths/register scripts/generate-work-status-report.ts 2025 6 1
 * ts-node --require tsconfig-paths/register scripts/generate-work-status-report.ts (現在週の場合)
 */

import dotenv from 'dotenv';
import { initializeFirebaseAdmin, getAdminDb } from '@/lib/firebase/admin';
import { generateWeeklyWorkStatusReport } from '@/lib/analytics/work-status-aggregation';
import { getWeekNumberFromDate } from '@/lib/date';
import { WeeklyWorkStatusReport } from '@/lib/types/work_status_report';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

// Firebase Admin SDKの初期化
initializeFirebaseAdmin();

/**
 * レポートをFirestoreに保存
 */
async function saveReport(report: WeeklyWorkStatusReport): Promise<void> {
  const adminDb = getAdminDb();
  const docRef = adminDb.collection('weekly_work_status_reports').doc(report.id);
  
  await docRef.set({
    ...report,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * メイン処理
 */
async function main() {
  console.log('=== 稼働状況レポート生成処理開始 ===');
  console.log(`実行時刻: ${new Date().toISOString()}`);
  
  // コマンドライン引数から年、月、月内週番号を取得
  let year: number;
  let month: number;
  let weekInMonth: number;
  
  if (process.argv.length >= 5) {
    year = parseInt(process.argv[2]);
    month = parseInt(process.argv[3]);
    weekInMonth = parseInt(process.argv[4]);
    
    if (isNaN(year) || isNaN(month) || isNaN(weekInMonth)) {
      console.error('エラー: 年、月、月内週番号は数値で指定してください');
      process.exit(1);
    }
    
    if (month < 1 || month > 12) {
      console.error('エラー: 月は1-12の範囲で指定してください');
      process.exit(1);
    }
    
    if (weekInMonth < 1 || weekInMonth > 5) {
      console.error('エラー: 月内週番号は1-5の範囲で指定してください');
      process.exit(1);
    }
  } else {
    // 引数がない場合は現在週を使用
    const now = new Date();
    const currentWeek = getWeekNumberFromDate(now);
    year = currentWeek.year;
    month = currentWeek.month;
    weekInMonth = currentWeek.weekInMonth;
  }
  
  console.log(`\n対象期間: ${year}年${month}月 第${weekInMonth}週`);
  
  try {
    // 1. レポート生成
    console.log('\n1. レポート生成中...');
    const report = await generateWeeklyWorkStatusReport(year, month, weekInMonth);
    
    // 2. レポート内容の表示
    displayReportSummary(report);
    
    // 3. Firestoreに保存
    console.log('\n3. Firestoreに保存中...');
    await saveReport(report);
    console.log('✅ レポート保存完了');
    
    // 4. 継続率の詳細表示
    displayContinuationRates(report);
    
    console.log('\n=== レポート生成処理完了 ===');
  } catch (error) {
    console.error('レポート生成エラー:', error);
    process.exit(1);
  }
}

/**
 * レポートサマリーを表示
 */
function displayReportSummary(report: WeeklyWorkStatusReport) {
  console.log('\n2. レポートサマリー:');
  console.log('---------------------');
  
  const summary = report.totalSummary;
  console.log(`【全体集計】`);
  console.log(`- 月初稼働人数: ${summary.activeMembers}名`);
  console.log(`- 新規稼働: ${summary.newWorkCount}名`);
  console.log(`- 切り替え: ${summary.switchingCount}名`);
  console.log(`- 案件解除: ${summary.projectReleaseCount}名`);
  console.log(`- 契約解除: ${summary.contractTerminationCount}名`);
  console.log(`- 月末稼働人数: ${summary.currentActiveMembers}名`);
  console.log(`- 純増減: ${summary.netChange >= 0 ? '+' : ''}${summary.netChange}名`);
  console.log(`- 離職率: ${summary.turnoverRate}%`);
  console.log(`- 成長率: ${summary.growthRate >= 0 ? '+' : ''}${summary.growthRate}%`);
  
  // 職種別集計
  console.log('\n【職種別集計】');
  for (const [category, categorySummary] of Object.entries(report.summaryByCategory)) {
    console.log(`\n${category}:`);
    console.log(`  - 月初: ${categorySummary.activeMembers}名`);
    console.log(`  - 新規: ${categorySummary.newWorkCount}名`);
    console.log(`  - 切替: ${categorySummary.switchingCount}名`);
    console.log(`  - 解除: ${categorySummary.projectReleaseCount}名`);
    console.log(`  - 終了: ${categorySummary.contractTerminationCount}名`);
    console.log(`  - 月末: ${categorySummary.currentActiveMembers}名`);
  }
}

/**
 * 継続率の詳細を表示
 */
function displayContinuationRates(report: WeeklyWorkStatusReport) {
  console.log('\n4. 継続率分析:');
  console.log('----------------');
  
  const rates = report.continuationRates;
  
  // 1ヶ月継続率
  console.log(`\n【1ヶ月継続率】`);
  console.log(`- 対象者数: ${rates.rate1Month.targetCount}名`);
  console.log(`- 継続者数: ${rates.rate1Month.continuedCount}名`);
  console.log(`- 継続率: ${rates.rate1Month.rate}%`);
  
  // 3ヶ月継続率
  console.log(`\n【3ヶ月継続率】`);
  console.log(`- 対象者数: ${rates.rate3Months.targetCount}名`);
  console.log(`- 継続者数: ${rates.rate3Months.continuedCount}名`);
  console.log(`- 継続率: ${rates.rate3Months.rate}%`);
  
  // 6ヶ月継続率
  console.log(`\n【6ヶ月継続率】`);
  console.log(`- 対象者数: ${rates.rate6Months.targetCount}名`);
  console.log(`- 継続者数: ${rates.rate6Months.continuedCount}名`);
  console.log(`- 継続率: ${rates.rate6Months.rate}%`);
  
  // 1年継続率
  console.log(`\n【1年継続率】`);
  console.log(`- 対象者数: ${rates.rate1Year.targetCount}名`);
  console.log(`- 継続者数: ${rates.rate1Year.continuedCount}名`);
  console.log(`- 継続率: ${rates.rate1Year.rate}%`);
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
} 