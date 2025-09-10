import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

async function checkApplicationWeeks() {
  console.log('=== 応募データの週分布確認 ===');
  
  try {
    // Firebase Admin初期化
    if (getApps().length === 0) {
      const serviceAccountPath = path.join(process.cwd(), 'venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json');
      const serviceAccount = require(serviceAccountPath);
      
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }
    
    const db = getFirestore();

    // 応募データを取得
    const applicationsSnapshot = await db.collection('applications').get();
    console.log(`総応募数: ${applicationsSnapshot.size}`);

    // 週別の分布を確認
    const weekDistribution: Record<string, number> = {};
    const yearDistribution: Record<string, number> = {};

    applicationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const applicationWeek = data.applicationWeek;
      const applicationDate = data.applicationDate;
      
      if (applicationWeek) {
        weekDistribution[applicationWeek] = (weekDistribution[applicationWeek] || 0) + 1;
      }
      
      if (applicationDate) {
        const year = applicationDate.split('-')[0];
        yearDistribution[year] = (yearDistribution[year] || 0) + 1;
      }
    });

    console.log('\n--- 年別分布 ---');
    Object.entries(yearDistribution)
      .sort()
      .forEach(([year, count]) => {
        console.log(`${year}年: ${count}件`);
      });

    console.log('\n--- 週別分布（上位20週） ---');
    Object.entries(weekDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .forEach(([week, count]) => {
        console.log(`${week}: ${count}件`);
      });

    // 2024年と2025年の最新週を確認
    console.log('\n--- 2024年の週データ ---');
    Object.entries(weekDistribution)
      .filter(([week]) => week.startsWith('2024'))
      .sort()
      .slice(-10)
      .forEach(([week, count]) => {
        console.log(`${week}: ${count}件`);
      });

    console.log('\n--- 2025年の週データ ---');
    Object.entries(weekDistribution)
      .filter(([week]) => week.startsWith('2025'))
      .sort()
      .forEach(([week, count]) => {
        console.log(`${week}: ${count}件`);
      });

    // 特定の週のデータを詳細確認
    const testWeek = '2024-52'; // 2024年第52週
    console.log(`\n--- ${testWeek}の詳細データ ---`);
    const weekApplications = await db.collection('applications')
      .where('applicationWeek', '==', testWeek)
      .get();
    
    console.log(`${testWeek}の応募数: ${weekApplications.size}`);
    
    const statusDistribution: Record<string, number> = {};
    const jobCategoryDistribution: Record<string, number> = {};
    
    weekApplications.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'unknown';
      const jobCategory = data.jobCategory || 'unknown';
      
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
      jobCategoryDistribution[jobCategory] = (jobCategoryDistribution[jobCategory] || 0) + 1;
    });

    console.log('ステータス分布:');
    Object.entries(statusDistribution).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}件`);
    });

    console.log('職種分布:');
    Object.entries(jobCategoryDistribution).forEach(([jobCategory, count]) => {
      console.log(`  ${jobCategory}: ${count}件`);
    });

  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

checkApplicationWeeks().then(() => {
  console.log('\n=== 確認完了 ===');
  process.exit(0);
}).catch(error => {
  console.error('スクリプト実行エラー:', error);
  process.exit(1);
}); 