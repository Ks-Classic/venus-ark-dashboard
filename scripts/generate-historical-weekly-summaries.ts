#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { initializeFirebaseAdmin, getAdminDb } from '../lib/firebase/admin';
import { getAllJobCategoryData } from '../lib/integrations/google-sheets';
import { JobCategory } from '../lib/types/enums';

// 環境変数を読み込み
dotenv.config({ path: '.env.local' });

// 週番号を計算する関数
function getWeekNumber(date: Date): number {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  
  // 土曜日を週の開始とするため、土曜日からの経過日数を計算
  const daysFromSaturday = (dayOfWeek + 1) % 7;
  
  // 週の開始日（土曜日）を計算
  const startDate = new Date(targetDate);
  startDate.setDate(targetDate.getDate() - daysFromSaturday);
  
  // 年と週番号を計算
  const year = startDate.getFullYear();
  const firstDay = new Date(year, 0, 1);
  const firstDayOfWeek = firstDay.getDay();
  const firstSaturday = new Date(firstDay);
  const daysToFirstSaturday = (6 - firstDayOfWeek + 7) % 7;
  firstSaturday.setDate(firstDay.getDate() + daysToFirstSaturday);
  
  if (startDate < firstSaturday) {
    return 1;
  }
  
  const diffTime = startDate.getTime() - firstSaturday.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

interface WeeklySummary {
  id: string;
  year: number;
  weekNumber: number;
  lastUpdated: Date;
  jobCategories: {
    [jobCategory: string]: {
      applications: number;
      interviews: number;
      hires: number;
      conversionRate: number;
      hireRate: number;
    };
  };
  totals: {
    applications: number;
    interviews: number;
    hires: number;
    conversionRate: number;
    hireRate: number;
  };
}

async function generateHistoricalWeeklySummaries(): Promise<void> {
  console.log('=== 過去の週次サマリー生成開始 ===');
  console.log(`開始時刻: ${new Date().toLocaleString('ja-JP')}`);

  // Firebase Admin SDK を初期化
  initializeFirebaseAdmin();
  const db = getAdminDb();
  
  try {
    // スプレッドシートからデータ取得
    console.log('スプレッドシートからデータ取得中...');
    const allJobData = await getAllJobCategoryData();
    
    // 全データを統合
    const allData: any[] = [];
    Object.entries(allJobData).forEach(([jobCategory, jobData]) => {
      jobData.forEach((row: any) => {
        allData.push({
          ...row,
          originalJobCategory: jobCategory
        });
      });
    });
    
    console.log(`統合データ数: ${allData.length}件`);
    
    // 週別・年別でグループ化
    const weeklyData: { [key: string]: any[] } = {};
    
    allData.forEach((row: any) => {
      const applicationDate = new Date(row.applicationDate || row['応募日'] || row['日付']);
      if (isNaN(applicationDate.getTime())) {
        return; // 無効な日付はスキップ
      }
      
      const year = applicationDate.getFullYear();
      const weekNumber = getWeekNumber(applicationDate);
      const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = [];
      }
      
      weeklyData[weekKey].push(row);
    });
    
    console.log(`処理対象週数: ${Object.keys(weeklyData).length}週`);
    
    // 各週のサマリーを生成
    for (const [weekKey, weekData] of Object.entries(weeklyData)) {
      console.log(`\n--- ${weekKey} の処理開始 ---`);
      console.log(`対象データ数: ${weekData.length}件`);
      
      const [yearStr, weekStr] = weekKey.split('-W');
      const year = parseInt(yearStr);
      const weekNumber = parseInt(weekStr);
      
      // 職種別集計
      const jobCategories: { [key: string]: any } = {};
      let totalApplications = 0;
      let totalInterviews = 0;
      let totalHires = 0;

      weekData.forEach((row: any) => {
        const jobCategory = row.originalJobCategory || row.jobCategory || row['職種'] || 'その他';
        
        if (!jobCategories[jobCategory]) {
          jobCategories[jobCategory] = {
            applications: 0,
            interviews: 0,
            hires: 0,
          };
        }

        jobCategories[jobCategory].applications++;
        totalApplications++;

        const status = row.status || row['現状ステータス'] || row['ステータス'];
        if (status === '面接' || status === '採用' || status === '不採用') {
          jobCategories[jobCategory].interviews++;
          totalInterviews++;
        }

        if (status === '採用') {
          jobCategories[jobCategory].hires++;
          totalHires++;
        }
      });

      // 変換率計算
      Object.keys(jobCategories).forEach(jobCategory => {
        const data = jobCategories[jobCategory];
        data.conversionRate = data.applications > 0 ? (data.interviews / data.applications) * 100 : 0;
        data.hireRate = data.interviews > 0 ? (data.hires / data.interviews) * 100 : 0;
      });

      const totalConversionRate = totalApplications > 0 ? (totalInterviews / totalApplications) * 100 : 0;
      const totalHireRate = totalInterviews > 0 ? (totalHires / totalInterviews) * 100 : 0;

      // Weekly Summary作成
      const weeklySummary: WeeklySummary = {
        id: weekKey,
        year,
        weekNumber,
        lastUpdated: new Date(),
        jobCategories,
        totals: {
          applications: totalApplications,
          interviews: totalInterviews,
          hires: totalHires,
          conversionRate: totalConversionRate,
          hireRate: totalHireRate,
        },
      };

      // Firestoreに保存
      console.log(`週次サマリー保存中: ${weekKey}`);
      await db.collection('weekly_summaries').doc(weekKey).set({
        ...weeklySummary,
        lastUpdated: new Date().toISOString(),
      });

      console.log(`${weekKey}: 応募数${totalApplications}件, 面接数${totalInterviews}件, 採用数${totalHires}件`);
    }
    
    console.log('\n=== 過去の週次サマリー生成完了 ===');
    console.log(`完了時刻: ${new Date().toLocaleString('ja-JP')}`);
    console.log(`生成週数: ${Object.keys(weeklyData).length}週`);
    
  } catch (error) {
    console.error('週次サマリー生成でエラーが発生:', error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  generateHistoricalWeeklySummaries()
    .then(() => {
      console.log('スクリプト実行完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('スクリプト実行エラー:', error);
      process.exit(1);
    });
} 