import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';

async function createTestWithAdminSDK() {
  console.log('🧪 Admin SDKでテストデータを作成します...');
  
  try {
    // Firebase Admin SDK の初期化
    if (getApps().length === 0) {
      const serviceAccountPath = path.resolve(__dirname, '../venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json');
      console.log('📁 サービスアカウントファイル:', serviceAccountPath);
      
      const serviceAccount = require(serviceAccountPath);
      
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      
      console.log('✅ Firebase Admin SDK 初期化完了');
    }
    
    const db = getFirestore();
    
    // テストデータ作成
    const testData = {
      title: "Admin SDKテスト施策",
      category: "SYSTEM_IMPROVEMENT",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assignee: "Admin SDKテスト",
      currentVersion: 1,
      dueDate: Timestamp.fromDate(new Date("2024-12-31")),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    console.log('📝 作成するデータ:', JSON.stringify(testData, null, 2));
    
    // initiatives コレクションに追加
    const docRef = await db.collection('initiatives').add(testData);
    console.log('✅ テストデータ作成成功:', docRef.id);
    
    // バージョンデータも作成
    const versionData = {
      initiativeId: docRef.id,
      version: 1,
      issue: "Admin SDK検証",
      cause: "Client SDK設定の問題",
      action: "Admin SDKでのデータ作成テスト", 
      result: "成功",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assignee: "Admin SDKテスト",
      changeReason: "初回作成",
      createdAt: Timestamp.now(),
      createdBy: "Admin SDKスクリプト"
    };
    
    const versionRef = await db.collection('initiative_versions').add(versionData);
    console.log('✅ バージョンデータ作成成功:', versionRef.id);
    
    console.log('🎉 Admin SDKでのデータ作成が完全に成功しました！');
    
  } catch (error) {
    console.error('❌ Admin SDKでのテスト作成エラー:', error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  createTestWithAdminSDK()
    .then(() => {
      console.log('✨ Admin SDKテストが正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Admin SDKテストでエラーが発生しました:', error);
      process.exit(1);
    });
}

export { createTestWithAdminSDK }; 