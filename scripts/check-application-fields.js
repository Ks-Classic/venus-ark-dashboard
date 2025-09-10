const admin = require('firebase-admin');
const serviceAccount = require('../venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'venus-ark-aix'
});

const db = admin.firestore();

async function checkApplicationFields() {
  console.log('=== Applications フィールド確認 ===');
  
  try {
    // 最初の10件のドキュメントを取得
    const snapshot = await db.collection('applications').limit(10).get();
    
    console.log(`取得したドキュメント数: ${snapshot.docs.length}`);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- ドキュメント ${index + 1}: ${doc.id} ---`);
      console.log('全フィールド:', Object.keys(data));
      
      // 各フィールドの値も確認
      Object.keys(data).forEach(key => {
        const value = data[key];
        if (typeof value === 'string' && value.length > 50) {
          console.log(`${key}: "${value.substring(0, 50)}..."`);
        } else {
          console.log(`${key}: ${JSON.stringify(value)}`);
        }
      });
    });
    
    // 特定のフィールドの統計
    console.log('\n=== フィールド統計 ===');
    const allDocs = await db.collection('applications').get();
    const fieldCounts = {};
    
    allDocs.docs.forEach(doc => {
      const data = doc.data();
      Object.keys(data).forEach(key => {
        fieldCounts[key] = (fieldCounts[key] || 0) + 1;
      });
    });
    
    console.log('フィールド出現回数:');
    Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]).forEach(([field, count]) => {
      console.log(`  ${field}: ${count}回`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  }
  
  process.exit(0);
}

checkApplicationFields().catch(console.error); 