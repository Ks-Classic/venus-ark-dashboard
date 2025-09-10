#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { initializeFirebaseAdmin, getAdminDb } from '../lib/firebase/admin';
import { getAllOptimizedJobCategoryData, ApplicationDataWithSource } from '../lib/integrations/optimized-google-sheets';
import { 
  OptimizedWeeklySummary, 
  JobCategorySourceMetrics, 
  JobCategory, 
  MediaSource 
} from '../lib/types/optimized-weekly-summary';

// 環境変数を読み込み
dotenv.config({ path: '.env.local' });

/**
 * 週番号を計算する関数（土曜日基準）
 */
function getWeekNumber(date: Date): { year: number; weekNumber: number; startDate: string; endDate: string } {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  
  // 土曜日を週の開始とするため、土曜日からの経過日数を計算
  const daysFromSaturday = (dayOfWeek + 1) % 7;
  
  // 週の開始日（土曜日）を計算
  const weekStart = new Date(targetDate);
  weekStart.setDate(targetDate.getDate() - daysFromSaturday);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  // 年と週番号を計算
  const year = weekStart.getFullYear();
  const firstDay = new Date(year, 0, 1);
  const firstDayOfWeek = firstDay.getDay();
  const firstSaturday = new Date(firstDay);
  const daysToFirstSaturday = (6 - firstDayOfWeek + 7) % 7;
  firstSaturday.setDate(firstDay.getDate() + daysToFirstSaturday);
  
  const weekNumber = Math.floor((weekStart.getTime() - firstSaturday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  return {
    year,
    weekNumber,
    startDate: formatDate(weekStart),
    endDate: formatDate(weekEnd)
  };
}

/**
 * 日付をYYYY-MM-DD形式でフォーマット
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * ApplicationDataWithSourceから詳細メトリクスを計算
 */
function calculateJobCategorySourceMetrics(applications: ApplicationDataWithSource[]): JobCategorySourceMetrics {
  const metrics: JobCategorySourceMetrics = {
    applications: 0,
    rejected: 0,
    continuing: 0,
    documents: 0,
    interviews: 0,
    interviewsCompleted: 0,
    interviewsDeclined: 0,
    hired: 0,
    accepted: 0,
    withdrawn: 0,
    rejectionReasons: {
      experienced: 0,
      elderly: 0,
      unsuitable: 0,
      foreign: 0,
      other: 0
    },
    conversionRates: {
      applicationToInterview: 0,
      interviewToHire: 0,
      hireToAcceptance: 0
    }
  };

  for (const app of applications) {
    metrics.applications++;
    
    const status = app.status.toLowerCase();
    
    // ステータス別集計
    if (status === '不採用') {
      metrics.rejected++;
      
      // 不採用理由の分類（実際のデータに合わせて正確にマッチング）
      const reason = app.rejectionReason || '';
      switch (reason) {
        case '経験者':
          metrics.rejectionReasons.experienced++;
          break;
        case '高齢':
          metrics.rejectionReasons.elderly++;
          break;
        case '不適合':
          metrics.rejectionReasons.unsuitable++;
          break;
        case '外国籍':
          metrics.rejectionReasons.foreign++;
          break;
        case 'その他':
        case '初回カウンセリング':
        case '内定辞退':
        case '返事待ち':
        case 'ばっくれ':
        case '上京確認':
        default:
          if (reason) { // 空でない理由がある場合のみカウント
            metrics.rejectionReasons.other++;
          }
          break;
      }
    } else if (status === '採用') {
      metrics.hired++;
      if (app.acceptanceDate) {
        metrics.accepted++;
      }
    } else if (status === '辞退') {
      metrics.withdrawn++;
    } else {
      metrics.continuing++;
    }
    
    // 書類・面接プロセス
    if (app.interviewDate) {
      metrics.interviews++;
      
      if (status === '面接' || status === '採用' || status === '不採用') {
        metrics.interviewsCompleted++;
      } else if (status === '辞退') {
        metrics.interviewsDeclined++;
      }
    }
    
    // 書類提出（面接に進んだ場合）
    if (status === '面接' || status === '採用' || status === '不採用') {
      metrics.documents++;
    }
  }
  
  // 変換率の計算
  metrics.conversionRates.applicationToInterview = metrics.applications > 0 
    ? (metrics.interviews / metrics.applications) * 100 
    : 0;
  
  metrics.conversionRates.interviewToHire = metrics.interviews > 0 
    ? (metrics.hired / metrics.interviews) * 100 
    : 0;
  
  metrics.conversionRates.hireToAcceptance = metrics.hired > 0 
    ? (metrics.accepted / metrics.hired) * 100 
    : 0;
  
  return metrics;
}

/**
 * 2つのメトリクスを合計する
 */
function addMetrics(a: JobCategorySourceMetrics, b: JobCategorySourceMetrics): JobCategorySourceMetrics {
  return {
    applications: a.applications + b.applications,
    rejected: a.rejected + b.rejected,
    continuing: a.continuing + b.continuing,
    documents: a.documents + b.documents,
    interviews: a.interviews + b.interviews,
    interviewsCompleted: a.interviewsCompleted + b.interviewsCompleted,
    interviewsDeclined: a.interviewsDeclined + b.interviewsDeclined,
    hired: a.hired + b.hired,
    accepted: a.accepted + b.accepted,
    withdrawn: a.withdrawn + b.withdrawn,
    rejectionReasons: {
      experienced: a.rejectionReasons.experienced + b.rejectionReasons.experienced,
      elderly: a.rejectionReasons.elderly + b.rejectionReasons.elderly,
      unsuitable: a.rejectionReasons.unsuitable + b.rejectionReasons.unsuitable,
      foreign: a.rejectionReasons.foreign + b.rejectionReasons.foreign,
      other: a.rejectionReasons.other + b.rejectionReasons.other
    },
    conversionRates: {
      applicationToInterview: (a.applications + b.applications) > 0 
        ? ((a.interviews + b.interviews) / (a.applications + b.applications)) * 100 
        : 0,
      interviewToHire: (a.interviews + b.interviews) > 0 
        ? ((a.hired + b.hired) / (a.interviews + b.interviews)) * 100 
        : 0,
      hireToAcceptance: (a.hired + b.hired) > 0 
        ? ((a.accepted + b.accepted) / (a.hired + b.hired)) * 100 
        : 0
    }
  };
}

/**
 * 過去の最適化された週次サマリーを生成する
 */
async function generateOptimizedHistoricalWeeklySummaries(): Promise<void> {
  try {
    console.log('=== 最適化された過去の週次サマリー生成開始 ===');
    console.log(`開始時刻: ${new Date().toLocaleString('ja-JP')}`);
    
    // Firebase Admin SDK を初期化
    initializeFirebaseAdmin();
    const db = getAdminDb();
    
    // 全データを取得
    console.log('Google Sheetsから全データを取得中...');
    const allApplications = await getAllOptimizedJobCategoryData();
    console.log(`取得したデータ件数: ${allApplications.length}件`);
    
    // 週別にデータを分類
    const weeklyData: { [weekKey: string]: ApplicationDataWithSource[] } = {};
    
    for (const app of allApplications) {
      try {
        const applicationDate = new Date(app.applicationDate);
        const { year, weekNumber } = getWeekNumber(applicationDate);
        const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = [];
        }
        weeklyData[weekKey].push(app);
      } catch (error) {
        console.warn(`日付の処理でエラー (${app.applicationDate}):`, error);
      }
    }
    
    console.log(`\n=== 週別データ分類完了: ${Object.keys(weeklyData).length}週分 ===`);
    
    // 各週のサマリーを生成
    for (const [weekKey, weekData] of Object.entries(weeklyData)) {
      console.log(`\n--- ${weekKey} の処理開始 ---`);
      console.log(`対象データ数: ${weekData.length}件`);
      
      const [yearStr, weekStr] = weekKey.split('-W');
      const year = parseInt(yearStr);
      const weekNumber = parseInt(weekStr);
      
      // 週の範囲を計算
      const sampleDate = new Date(weekData[0].applicationDate);
      const { startDate, endDate } = getWeekNumber(sampleDate);
      
      // 職種・媒体別に分類
      const jobCategoryData: { [key: string]: { [key: string]: ApplicationDataWithSource[] } } = {};
      
      for (const app of weekData) {
        if (!jobCategoryData[app.jobCategory]) {
          jobCategoryData[app.jobCategory] = {};
        }
        if (!jobCategoryData[app.jobCategory][app.mediaSource]) {
          jobCategoryData[app.jobCategory][app.mediaSource] = [];
        }
        jobCategoryData[app.jobCategory][app.mediaSource].push(app);
      }
      
      // 詳細メトリクスを計算
      const detailedMetrics: any = {};
      const totals: any = { bySource: {}, byJobCategory: {} };
      
      // 全媒体、全職種の初期化
      for (const source of ['indeed', 'engage', 'other'] as MediaSource[]) {
        totals.bySource[source] = {
          applications: 0, rejected: 0, continuing: 0, documents: 0, interviews: 0,
          interviewsCompleted: 0, interviewsDeclined: 0, hired: 0, accepted: 0, withdrawn: 0,
          rejectionReasons: { experienced: 0, elderly: 0, unsuitable: 0, foreign: 0, other: 0 },
          conversionRates: { applicationToInterview: 0, interviewToHire: 0, hireToAcceptance: 0 }
        };
      }
      
      for (const jobCategory of ['SNS運用', '動画クリエイター', 'AIライター', '撮影スタッフ'] as JobCategory[]) {
        detailedMetrics[jobCategory] = {};
        totals.byJobCategory[jobCategory] = {
          applications: 0, rejected: 0, continuing: 0, documents: 0, interviews: 0,
          interviewsCompleted: 0, interviewsDeclined: 0, hired: 0, accepted: 0, withdrawn: 0,
          rejectionReasons: { experienced: 0, elderly: 0, unsuitable: 0, foreign: 0, other: 0 },
          conversionRates: { applicationToInterview: 0, interviewToHire: 0, hireToAcceptance: 0 }
        };
        
        // 媒体別メトリクス
        for (const source of ['indeed', 'engage', 'other'] as MediaSource[]) {
          const sourceData = jobCategoryData[jobCategory]?.[source] || [];
          const metrics = calculateJobCategorySourceMetrics(sourceData);
          detailedMetrics[jobCategory][source] = metrics;
          
          // 職種合計に加算
          totals.byJobCategory[jobCategory] = addMetrics(totals.byJobCategory[jobCategory], metrics);
          
          // 媒体合計に加算
          totals.bySource[source] = addMetrics(totals.bySource[source], metrics);
        }
        
        // 職種合計を計算
        detailedMetrics[jobCategory].total = totals.byJobCategory[jobCategory];
      }
      
      // 全体合計を計算
      const allSourceMetrics = Object.values(totals.bySource) as JobCategorySourceMetrics[];
      totals.bySource.all = allSourceMetrics
        .reduce((acc: JobCategorySourceMetrics, curr: JobCategorySourceMetrics) => addMetrics(acc, curr));
      
      // Weekly Summary作成
      const optimizedSummary: OptimizedWeeklySummary = {
        id: weekKey,
        year,
        weekNumber,
        startDate,
        endDate,
        detailedMetrics,
        totals,
        lastUpdated: new Date().toISOString(),
        sourceDataCount: weekData.length,
        syncedAt: new Date().toISOString()
      };
      
      // Firestoreに保存
      console.log(`最適化された週次サマリー保存中: ${weekKey}`);
      await db.collection('optimized_weekly_summaries').doc(weekKey).set(optimizedSummary);
      
      const totalApps = totals.bySource.all.applications;
      const totalInterviews = totals.bySource.all.interviews;
      const totalHires = totals.bySource.all.hired;
      
      console.log(`${weekKey}: 応募数${totalApps}件, 面接数${totalInterviews}件, 採用数${totalHires}件`);
    }
    
    console.log('\n=== 最適化された過去の週次サマリー生成完了 ===');
    console.log(`完了時刻: ${new Date().toLocaleString('ja-JP')}`);
    console.log(`生成週数: ${Object.keys(weeklyData).length}週`);
    
    // 古いコレクションのクリーンアップ（オプション）
    console.log('\n=== 古いweekly_summariesコレクションの確認 ===');
    const oldSnapshot = await db.collection('weekly_summaries').limit(1).get();
    if (!oldSnapshot.empty) {
      console.log('古いweekly_summariesコレクションが存在します。手動で削除を検討してください。');
    }
    
  } catch (error) {
    console.error('最適化された週次サマリー生成でエラーが発生:', error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  generateOptimizedHistoricalWeeklySummaries()
    .then(() => {
      console.log('スクリプト実行完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('スクリプト実行エラー:', error);
      process.exit(1);
    });
}

export { generateOptimizedHistoricalWeeklySummaries }; 