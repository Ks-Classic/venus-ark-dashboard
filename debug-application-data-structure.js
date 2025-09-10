const admin = require('firebase-admin');

// Firebase Admin初期化
if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.error('環境変数 FIREBASE_SERVICE_ACCOUNT_KEY が設定されていません');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(serviceAccountKey);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();

async function analyzeApplicationDataStructure() {
  console.log('=== 応募データ構造の詳細分析 ===');
  
  try {
    // 応募データの最初の5件を取得
    const snapshot = await db.collection('applications')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    console.log(`\n📊 応募データ総数: ${snapshot.size}`);
    
    if (snapshot.empty) {
      console.log('❌ 応募データが存在しません');
      return;
    }
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n[${index + 1}] 応募データ詳細:`);
      console.log(`ID: ${doc.id}`);
      console.log(`応募者名: ${data.applicantName || 'undefined'}`);
      console.log(`職種: ${data.jobCategory || 'undefined'}`);
      console.log(`応募日 (applicationDate): ${data.applicationDate || 'undefined'}`);
      console.log(`応募日型: ${typeof data.applicationDate}`);
      console.log(`応募週 (applicationWeek): ${data.applicationWeek || 'undefined'}`);
      console.log(`ステータス: ${data.status || 'undefined'}`);
      console.log(`媒体: ${data.mediaSource || 'undefined'}`);
      console.log(`作成日: ${data.createdAt ? data.createdAt.toDate() : 'undefined'}`);
      console.log(`更新日: ${data.updatedAt ? data.updatedAt.toDate() : 'undefined'}`);
      console.log(`同期日: ${data.syncedAt ? data.syncedAt.toDate() : 'undefined'}`);
      
      // 重要フィールドの詳細
      if (data.applicationDate) {
        console.log(`応募日詳細: ${JSON.stringify(data.applicationDate)}`);
      }
      
      console.log('---');
    });
    
    // 職種別件数
    console.log('\n📈 職種別件数:');
    const jobCategories = ['SNS運用', 'AIライター', '動画クリエイター', '撮影スタッフ', 'WEBデザイン'];
    for (const category of jobCategories) {
      const count = await db.collection('applications')
        .where('jobCategory', '==', category)
        .count()
        .get();
      console.log(`${category}: ${count.data().count}件`);
    }
    
    // 日付範囲テスト
    console.log('\n🔍 日付範囲検索テスト:');
    const testDates = [
      { start: '2025-06-14', end: '2025-06-20' }, // 2025-W25
      { start: '2025-06-28', end: '2025-07-04' }, // 2025-W27
    ];
    
    for (const { start, end } of testDates) {
      console.log(`\n期間: ${start} 〜 ${end}`);
      
      // 全職種
      const allSnapshot = await db.collection('applications')
        .where('applicationDate', '>=', start)
        .where('applicationDate', '<=', end)
        .get();
      console.log(`全職種: ${allSnapshot.size}件`);
      
      // AIライター
      const aiSnapshot = await db.collection('applications')
        .where('applicationDate', '>=', start)
        .where('applicationDate', '<=', end)
        .where('jobCategory', '==', 'AIライター')
        .get();
      console.log(`AIライター: ${aiSnapshot.size}件`);
      
      if (aiSnapshot.size > 0) {
        aiSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`  - ${data.applicantName} (${data.applicationDate})`);
        });
      }
    }
    
  } catch (error) {
    console.error('データ分析エラー:', error);
  }
}

analyzeApplicationDataStructure(); 