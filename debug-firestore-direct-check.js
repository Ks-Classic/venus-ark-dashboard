const admin = require('firebase-admin');

// Firebase Admin SDK初期化
if (!admin.apps.length) {
  // 環境変数から認証情報を読み込み
  const firebaseKeyEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let serviceAccount;
  
  if (firebaseKeyEnv) {
    try {
      serviceAccount = JSON.parse(firebaseKeyEnv);
    } catch (error) {
      console.log('❌ 環境変数の解析エラー:', error.message);
      console.log('🔄 JSONファイルから直接読み込み');
      serviceAccount = require('./venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json');
    }
  } else {
    console.log('🔄 環境変数が設定されていません。JSONファイルから読み込み');
    serviceAccount = require('./venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

const db = admin.firestore();

async function checkFirestoreData() {
  try {
    console.log('🔥 Firestoreの直接確認開始');
    
    // 1. applications コレクションの確認
    console.log('\n=== applications コレクション ===');
    const applicationsRef = db.collection('applications');
    
    // 総件数確認
    const applicationsSnapshot = await applicationsRef.get();
    console.log('📊 総件数:', applicationsSnapshot.size);
    
    // 最新の10件確認
    const recentApplications = await applicationsRef
      .orderBy('applicationDate', 'desc')
      .limit(10)
      .get();
    
    console.log('📝 最新の10件:');
    recentApplications.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  ${index + 1}. ID: ${doc.id}`);
      console.log(`     応募日: ${data.applicationDate?.toDate ? data.applicationDate.toDate().toISOString().split('T')[0] : data.applicationDate}`);
      console.log(`     職種: ${data.jobCategory}`);
      console.log(`     媒体: ${data.mediaSource}`);
      console.log(`     ステータス: ${data.status}`);
      console.log('');
    });
    
    // 週別件数確認
    const weekCounts = {};
    applicationsSnapshot.forEach(doc => {
      const data = doc.data();
      const date = data.applicationDate?.toDate ? data.applicationDate.toDate() : new Date(data.applicationDate);
      if (date && !isNaN(date.getTime())) {
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        const weekId = `${year}-W${String(week).padStart(2, '0')}`;
        weekCounts[weekId] = (weekCounts[weekId] || 0) + 1;
      }
    });
    
    console.log('📈 週別件数:');
    Object.entries(weekCounts)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10)
      .forEach(([weekId, count]) => {
        console.log(`  ${weekId}: ${count}件`);
      });
    
    // 2. weekly_reports コレクションの確認
    console.log('\n=== weekly_reports コレクション ===');
    const weeklyReportsRef = db.collection('weekly_reports');
    
    // 総件数確認
    const weeklyReportsSnapshot = await weeklyReportsRef.get();
    console.log('📊 総件数:', weeklyReportsSnapshot.size);
    
    // 最新の10件確認
    const recentReports = await weeklyReportsRef
      .orderBy('year', 'desc')
      .orderBy('weekNumber', 'desc')
      .limit(10)
      .get();
    
    console.log('📝 最新の10件:');
    recentReports.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  ${index + 1}. ID: ${doc.id}`);
      console.log(`     年週: ${data.year}-W${String(data.weekNumber).padStart(2, '0')}`);
      console.log(`     職種: ${data.jobCategory}`);
      console.log(`     応募数: ${data.recruitmentMetrics?.applications || data.applications || 0}`);
      console.log(`     面接数: ${data.recruitmentMetrics?.interviews || data.interviews || 0}`);
      console.log('');
    });
    
    // 特定週の詳細確認
    console.log('\n=== 2025-W25, W27 の詳細確認 ===');
    const targetWeeks = [25, 27];
    
    for (const weekNum of targetWeeks) {
      console.log(`\n--- 2025-W${weekNum} ---`);
      const weeklyReports = await weeklyReportsRef
        .where('year', '==', 2025)
        .where('weekNumber', '==', weekNum)
        .get();
      
      if (weeklyReports.empty) {
        console.log('❌ データが存在しません');
      } else {
        weeklyReports.forEach(doc => {
          const data = doc.data();
          console.log(`職種: ${data.jobCategory}`);
          console.log(`  応募数: ${data.recruitmentMetrics?.applications || data.applications || 0}`);
          console.log(`  不採用数: ${data.recruitmentMetrics?.application_rejections || data.application_rejections || 0}`);
          console.log(`  面接数: ${data.recruitmentMetrics?.interviews || data.interviews || 0}`);
        });
      }
    }
    
    console.log('\n✅ Firestore直接確認完了');
    
  } catch (error) {
    console.error('❌ Firestore確認エラー:', error);
  }
}

// 週番号計算関数
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// 実行
checkFirestoreData(); 