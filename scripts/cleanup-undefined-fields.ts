import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore';

// Firebase設定
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// undefinedフィールドを削除する関数
async function cleanupUndefinedFields() {
  console.log('=== Firestore undefined フィールドクリーンアップ開始 ===');
  
  const applicationsRef = collection(db, 'applications');
  const querySnapshot = await getDocs(applicationsRef);
  
  console.log(`総ドキュメント数: ${querySnapshot.size}`);
  
  let processedCount = 0;
  let updatedCount = 0;
  
  // 削除対象のフィールド名
  const fieldsToCheck = [
    'phone',
    'documentSubmitDate', 
    'interviewDate',
    'interviewImplementedDate',
    'hireDate',
    'acceptanceDate',
    'rejectionReason',
    'rejectionDetail',
    'formSubmissionTimestamp'
  ];
  
  for (const docSnapshot of querySnapshot.docs) {
    const data = docSnapshot.data();
    const docRef = doc(db, 'applications', docSnapshot.id);
    
    // undefinedまたは空文字列のフィールドを特定
    const fieldsToDelete: any = {};
    let needsUpdate = false;
    
    for (const field of fieldsToCheck) {
      const value = data[field];
      if (value === undefined || value === '' || value === null) {
        fieldsToDelete[field] = deleteField();
        needsUpdate = true;
      }
    }
    
    // 更新が必要な場合のみ実行
    if (needsUpdate) {
      try {
        await updateDoc(docRef, fieldsToDelete);
        updatedCount++;
        console.log(`[${updatedCount}] ドキュメント ${docSnapshot.id} の不正フィールドを削除`);
      } catch (error) {
        console.error(`ドキュメント ${docSnapshot.id} の更新に失敗:`, error);
      }
    }
    
    processedCount++;
    
    // 進捗表示
    if (processedCount % 100 === 0) {
      console.log(`進捗: ${processedCount}/${querySnapshot.size} (更新: ${updatedCount})`);
    }
  }
  
  console.log('\n=== クリーンアップ完了 ===');
  console.log(`処理済み: ${processedCount}`);
  console.log(`更新済み: ${updatedCount}`);
  console.log(`正常: ${processedCount - updatedCount}`);
}

// 実行
cleanupUndefinedFields().catch(console.error); 