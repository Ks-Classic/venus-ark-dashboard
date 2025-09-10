import { initializeFirebaseAdmin, getAdminDb } from '../lib/firebase/admin';

// Firebase Admin SDKの初期化
initializeFirebaseAdmin();

async function debugMemberFields() {
  try {
    const adminDb = getAdminDb();
    
    console.log('=== Firestoreメンバーデータのフィールド確認 ===');
    
    // 最初の10件のメンバーデータを取得
    const membersSnapshot = await adminDb.collection('members').limit(10).get();
    
    console.log(`取得したメンバー数: ${membersSnapshot.docs.length}`);
    
    membersSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const fields = Object.keys(data);
      
      console.log(`\n[${index + 1}] メンバー: ${data.name || 'Unknown'}`);
      console.log(`フィールド数: ${fields.length}`);
      console.log(`フィールド一覧: ${fields.join(', ')}`);
      
      // 重要なフィールドの値を確認
      const importantFields = [
        'lastWorkStartDate',
        'firstWorkStartDate', 
        'lastWorkEndDate',
        'contractEndDate',
        'status'
      ];
      
      importantFields.forEach(field => {
        if (data[field]) {
          const value = data[field];
          if (value?.toDate) {
            console.log(`  ${field}: ${value.toDate().toISOString().split('T')[0]} (Timestamp)`);
          } else {
            console.log(`  ${field}: ${value} (${typeof value})`);
          }
        } else {
          console.log(`  ${field}: なし`);
        }
      });
    });
    
    // lastWorkEndDateを持つメンバーを検索
    console.log('\n=== lastWorkEndDateを持つメンバーの検索 ===');
    const membersWithEndDate = await adminDb.collection('members')
      .where('lastWorkEndDate', '!=', null)
      .limit(5)
      .get();
    
    console.log(`lastWorkEndDateを持つメンバー数: ${membersWithEndDate.docs.length}`);
    
    membersWithEndDate.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`[${index + 1}] ${data.name}: 終了日=${data.lastWorkEndDate?.toDate()?.toISOString().split('T')[0]}`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

debugMemberFields(); 