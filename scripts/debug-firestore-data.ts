import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// Firebase Admin SDK初期化
if (!getApps().length) {
  try {
    const serviceAccount = require('./venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json');
    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'venus-ark-aix'
    });
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    process.exit(1);
  }
}

const db = getFirestore();

async function investigateFirestoreData() {
  console.log('🔍 Firestore実データ調査開始\n');

  try {
    // 1. 全体データ統計
    console.log('📊 Phase 1: 全体データ統計');
    const allApplicationsSnapshot = await db.collection('applications').get();
    console.log(`総応募データ数: ${allApplicationsSnapshot.size}件\n`);

    // 2. ステータス分布調査
    console.log('📊 Phase 2: ステータス分布調査');
    const statusCounts: Record<string, number> = {};
    
    allApplicationsSnapshot.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('ステータス分布:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}件`);
    });
    console.log();

    // 3. 6月3週（2025-06-21〜2025-06-27）のデータ調査
    console.log('📊 Phase 3: 6月3週（2025-06-21〜2025-06-27）のデータ調査');
    const weekStartDate = new Date('2025-06-21');
    const weekEndDate = new Date('2025-06-27');
    
    console.log(`調査期間: ${format(weekStartDate, 'yyyy-MM-dd')} 〜 ${format(weekEndDate, 'yyyy-MM-dd')}\n`);

    const weekApplications = allApplicationsSnapshot.docs.filter(doc => {
      const data = doc.data();
      let applicationDate;
      if (data.applicationDate?.toDate) {
        applicationDate = data.applicationDate.toDate();
      } else if (data.applicationDate?.seconds) {
        applicationDate = new Date(data.applicationDate.seconds * 1000);
      } else if (typeof data.applicationDate === 'string') {
        applicationDate = new Date(data.applicationDate);
      } else {
        return false; // 日付が不正な場合は除外
      }
      return applicationDate >= weekStartDate && applicationDate <= weekEndDate;
    });

    console.log(`6月3週の応募データ数: ${weekApplications.length}件\n`);

    if (weekApplications.length > 0) {
      console.log('6月3週のデータ詳細:');
             weekApplications.forEach((doc, index) => {
         const data = doc.data();
         let applicationDate;
         if (data.applicationDate?.toDate) {
           applicationDate = data.applicationDate.toDate();
         } else if (data.applicationDate?.seconds) {
           applicationDate = new Date(data.applicationDate.seconds * 1000);
         } else if (typeof data.applicationDate === 'string') {
           applicationDate = new Date(data.applicationDate);
         } else {
           applicationDate = new Date(); // フォールバック
         }
         console.log(`${index + 1}. ID: ${doc.id}`);
         console.log(`   応募日: ${format(applicationDate, 'yyyy-MM-dd', { locale: ja })}`);
         console.log(`   ステータス: ${data.status || 'unknown'}`);
         console.log(`   不採用理由: ${data.rejectionReason || 'なし'}`);
         console.log(`   職種: ${data.jobCategory || 'unknown'}`);
         console.log(`   媒体: ${data.mediaSource || 'unknown'}`);
         console.log();
       });

      // 6月3週のステータス分布
      const weekStatusCounts: Record<string, number> = {};
      weekApplications.forEach(doc => {
        const data = doc.data();
        const status = data.status || 'unknown';
        weekStatusCounts[status] = (weekStatusCounts[status] || 0) + 1;
      });

      console.log('6月3週のステータス分布:');
      Object.entries(weekStatusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}件`);
      });
      console.log();

      // 不採用関連ステータスの詳細
      const rejectionStatuses = ['応募落ち', '書類落ち', '不採用'];
      const rejectionData = weekApplications.filter(doc => {
        const status = doc.data().status;
        return rejectionStatuses.includes(status);
      });

      console.log(`6月3週の不採用関連データ: ${rejectionData.length}件`);
      if (rejectionData.length > 0) {
        rejectionData.forEach((doc, index) => {
          const data = doc.data();
          console.log(`  ${index + 1}. ${data.status}: ${data.rejectionReason || 'なし'}`);
        });
      }
      console.log();
    }

    // 4. 週次サマリーデータ調査
    console.log('📊 Phase 4: 週次サマリーデータ調査');
    const summariesSnapshot = await db.collection('weeklyRecruitmentSummaries').get();
    console.log(`週次サマリー総数: ${summariesSnapshot.size}件\n`);

    // 2025-W25（6月3週）のサマリーを探す
    const targetWeekSummaries = summariesSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.weekId === '2025-W25';
    });

    console.log(`2025-W25のサマリー数: ${targetWeekSummaries.length}件`);
    if (targetWeekSummaries.length > 0) {
      targetWeekSummaries.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n${index + 1}. サマリーID: ${doc.id}`);
        console.log(`   週ID: ${data.weekId}`);
        console.log(`   職種: ${data.jobCategory || 'unknown'}`);
        console.log(`   媒体: ${JSON.stringify(data.mediaSources || [])}`);
        console.log(`   応募数: ${data.applicationCount || 0}`);
        console.log(`   内不採用数: ${data.internalRejectionCount || 0}`);
        console.log(`   書類内不採用数: ${data.documentRejectionCount || 0}`);
        console.log(`   従来の不採用数: ${data.rejectionCount || 0}`);
        console.log(`   不採用理由内訳: ${JSON.stringify(data.rejectionReasons || {})}`);
        console.log(`   最終更新: ${data.lastUpdated?.toDate() || 'unknown'}`);
      });
    }

  } catch (error) {
    console.error('❌ Firestore調査エラー:', error);
  }
}

// メイン実行
investigateFirestoreData().then(() => {
  console.log('🎯 Firestore調査完了');
  process.exit(0);
}).catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
}); 