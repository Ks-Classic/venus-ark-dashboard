import dotenv from 'dotenv';
import path from 'path';
import { getWeekDateRange } from '../lib/date';
import { getApplicationsByDateRange } from '../lib/firestore/applications';
import { generateWeeklyRecruitmentReport } from '../lib/analytics/weekly-aggregation';
import { upsertWeeklyReport } from '../lib/firestore/weekly_reports';
import { JobCategory } from '../lib/types/enums';

// .env.localを読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugSyncIssue() {
  console.log('=== 同期問題デバッグ開始 ===');
  
  // 動的インポートでFirebase Admin SDKを初期化
  const { initializeFirebaseAdmin } = await import('../lib/firebase/admin');
  initializeFirebaseAdmin();
  console.log('Firebase Admin SDK Initialized.');

  try {
    // テスト用の週を設定（2025年8月第2週）
    const testYear = 2025;
    const testMonth = 8;
    const testWeek = 2;
    
    console.log(`\n--- テスト週: ${testYear}年${testMonth}月${testWeek}週 ---`);
    
    // 週の日付範囲を計算
    const { start, end } = getWeekDateRange(testYear, testMonth, testWeek);
    console.log(`週の期間: ${start.toISOString().split('T')[0]} 〜 ${end.toISOString().split('T')[0]}`);
    
    // 1. アプリケーションデータの取得テスト
    console.log('\n--- アプリケーションデータ取得テスト ---');
    const applications = await getApplicationsByDateRange(start, end);
    console.log(`取得件数: ${applications.length}件`);
    
    if (applications.length > 0) {
      console.log('最初の3件のサンプル:');
      applications.slice(0, 3).forEach((app, index) => {
        console.log(`${index + 1}. ${app.applicantName} (${app.jobCategory}) - ${app.applicationDate}`);
      });
    }
    
    // 2. 週次レポート生成テスト
    console.log('\n--- 週次レポート生成テスト ---');
    const jobCategories: JobCategory[] = Object.values(JobCategory);
    
    for (const jobCategory of jobCategories) {
      console.log(`\n${jobCategory}のレポート生成中...`);
      try {
        const report = await generateWeeklyRecruitmentReport(testYear, testMonth, testWeek, jobCategory);
        console.log(`レポート生成成功: ${report.id}`);
        console.log(`メトリクス: 応募数=${report.recruitmentMetrics?.applyCount || 0}`);
        
        // 3. レポート保存テスト
        console.log('レポート保存中...');
        await upsertWeeklyReport(report);
        console.log('レポート保存成功');
        
      } catch (error) {
        console.error(`${jobCategory}のレポート生成/保存でエラー:`, error);
      }
    }
    
    console.log('\n=== デバッグ完了 ===');
    
  } catch (error) {
    console.error('デバッグ中にエラーが発生:', error);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  debugSyncIssue().then(() => {
    console.log('デバッグスクリプトが正常に完了しました。');
    process.exit(0);
  }).catch((error) => {
    console.error('デバッグスクリプトでエラーが発生:', error);
    process.exit(1);
  });
}

