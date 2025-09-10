import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

async function debugRecruitmentData() {
  console.log('=== 採用データデバッグ開始 ===');
  
  try {
    // Firebase Admin初期化（サービスアカウントキーファイルを直接使用）
    if (getApps().length === 0) {
      const serviceAccountPath = path.join(process.cwd(), 'venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json');
      const serviceAccount = require(serviceAccountPath);
      
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }
    
    const db = getFirestore();

    // 1. weekly_reports コレクションの確認
    console.log('\n1. === weekly_reports コレクション確認 ===');
    const weeklyReportsSnapshot = await db.collection('weekly_reports').limit(5).get();
    console.log(`総ドキュメント数: ${weeklyReportsSnapshot.size}`);
    
    weeklyReportsSnapshot.docs.forEach((doc, index) => {
      console.log(`\n--- weekly_reports サンプル ${index + 1} ---`);
      console.log(`ID: ${doc.id}`);
      const data = doc.data();
      console.log(`年: ${data.year}, 週: ${data.weekNumber}`);
      console.log(`職種: ${data.jobCategory}`);
      console.log(`応募数: ${data.totalApplications}`);
      console.log(`書類提出数: ${data.documentsSubmitted}`);
      console.log(`面接数: ${data.interviews}`);
      console.log(`採用数: ${data.hired}`);
      console.log(`不採用数: ${data.rejected}`);
      console.log(`辞退数: ${data.withdrawn}`);
      if (data.rejectionReasons) {
        console.log(`不採用理由:`, data.rejectionReasons);
      }
    });

    // 2. applications コレクションの確認
    console.log('\n\n2. === applications コレクション確認 ===');
    const applicationsSnapshot = await db.collection('applications').limit(10).get();
    console.log(`総ドキュメント数: ${applicationsSnapshot.size}`);

    // ステータス分布の確認
    const statusDistribution: Record<string, number> = {};
    const allApplicationsSnapshot = await db.collection('applications').get();
    
    allApplicationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'unknown';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });

    console.log('\n--- ステータス分布 ---');
    Object.entries(statusDistribution).forEach(([status, count]) => {
      console.log(`${status}: ${count}件`);
    });

    // 3. 最新の応募データサンプル
    console.log('\n--- applications サンプル ---');
    applicationsSnapshot.docs.slice(0, 5).forEach((doc, index) => {
      console.log(`\n--- applications サンプル ${index + 1} ---`);
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`氏名: ${data.applicantName}`);
      console.log(`職種: ${data.jobCategory}`);
      console.log(`応募日: ${data.applicationDate}`);
      console.log(`ステータス: ${data.status}`);
      console.log(`書類提出日: ${data.documentSubmitDate || '未提出'}`);
      console.log(`面接日: ${data.interviewDate || '未実施'}`);
      console.log(`採用日: ${data.hireDate || '未採用'}`);
      console.log(`不採用理由: ${data.rejectionReason || 'なし'}`);
    });

    // 4. 週次集計データの確認
    console.log('\n\n3. === weekly_summaries コレクション確認 ===');
    const weeklySummariesSnapshot = await db.collection('weekly_summaries').limit(3).get();
    console.log(`総ドキュメント数: ${weeklySummariesSnapshot.size}`);

    weeklySummariesSnapshot.docs.forEach((doc, index) => {
      console.log(`\n--- weekly_summaries サンプル ${index + 1} ---`);
      console.log(`ID: ${doc.id}`);
      const data = doc.data();
      console.log(`年: ${data.year}, 週: ${data.weekNumber}`);
      if (data.totals) {
        console.log(`合計 - 応募: ${data.totals.applications}, 書類: ${data.totals.documents}, 面接: ${data.totals.interviews}, 採用: ${data.totals.hired}`);
      }
      if (data.jobCategories) {
        console.log(`職種別データ:`, Object.keys(data.jobCategories));
      }
    });

    // 5. 特定の週のデータ詳細確認（2024年第50週など）
    console.log('\n\n4. === 特定週のデータ詳細確認 ===');
    const specificWeekApplications = await db.collection('applications')
      .where('applicationWeek', '==', '2024-50')
      .get();
    
    console.log(`2024年第50週の応募数: ${specificWeekApplications.size}`);
    
    const weekStatusDistribution: Record<string, number> = {};
    specificWeekApplications.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'unknown';
      weekStatusDistribution[status] = (weekStatusDistribution[status] || 0) + 1;
    });

    console.log('2024年第50週のステータス分布:');
    Object.entries(weekStatusDistribution).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}件`);
    });

  } catch (error) {
    console.error('デバッグ中にエラーが発生しました:', error);
  }
}

// 実行
debugRecruitmentData().then(() => {
  console.log('\n=== 採用データデバッグ完了 ===');
  process.exit(0);
}).catch(error => {
  console.error('スクリプト実行エラー:', error);
  process.exit(1);
}); 