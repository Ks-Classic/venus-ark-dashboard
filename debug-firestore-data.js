const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { credential } = require('firebase-admin');

// Firebase Admin初期化
try {
  const serviceAccount = require('./venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json');
  initializeApp({
    credential: credential.cert(serviceAccount),
    projectId: 'venus-ark-aix'
  });
} catch (error) {
  console.error('Firebase初期化エラー:', error);
  process.exit(1);
}

const db = getFirestore();

async function checkData() {
  try {
    console.log('=== Firestoreデータ確認 ===');
    
    // weekly_reportsコレクションを確認
    const weeklyReportsRef = db.collection('weekly_reports');
    const weeklyReportsSnapshot = await weeklyReportsRef.limit(10).get();
    
    console.log('📊 weekly_reportsコレクション:');
    console.log(`  - 件数: ${weeklyReportsSnapshot.size}`);
    
    if (weeklyReportsSnapshot.size > 0) {
      weeklyReportsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  [${index}] ${doc.id}:`, {
          year: data.year,
          weekNumber: data.weekNumber,
          jobCategory: data.jobCategory,
          reportType: data.reportType,
          applications: data.recruitmentMetrics?.applications,
          documents: data.recruitmentMetrics?.documents,
          interviews: data.recruitmentMetrics?.interviews,
          hires: data.recruitmentMetrics?.hires
        });
      });
    }
    
    // applicationsコレクションを確認
    const applicationsRef = db.collection('applications');
    const applicationsSnapshot = await applicationsRef.limit(10).get();
    
    console.log('📋 applicationsコレクション:');
    console.log(`  - 件数: ${applicationsSnapshot.size}`);
    
    if (applicationsSnapshot.size > 0) {
      applicationsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  [${index}] ${doc.id}:`, {
          applicationWeek: data.applicationWeek,
          status: data.status,
          jobCategory: data.jobCategory,
          mediaSource: data.mediaSource,
          applicationDate: data.applicationDate
        });
      });
    }
    
    // 特定の週のデータを確認
    console.log('\n=== 特定週のデータ確認 ===');
    const targetWeeks = ['2025-W25', '2025-W26', '2025-W27', '2025-W28'];
    
    for (const weekId of targetWeeks) {
      const [year, weekStr] = weekId.split('-W');
      const weekNumber = parseInt(weekStr);
      
      const weeklyQuery = weeklyReportsRef
        .where('year', '==', parseInt(year))
        .where('weekNumber', '==', weekNumber)
        .where('reportType', '==', 'recruitment');
      
      const weeklySnapshot = await weeklyQuery.get();
      console.log(`${weekId}: ${weeklySnapshot.size}件`);
      
      weeklySnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: applications=${data.recruitmentMetrics?.applications || 0}`);
      });
    }
    
  } catch (error) {
    console.error('データ確認エラー:', error);
  }
}

checkData().then(() => {
  console.log('データ確認完了');
  process.exit(0);
}).catch(error => {
  console.error('エラー:', error);
  process.exit(1);
}); 