import { db } from '../lib/firebase/client';
import { collection, addDoc, Timestamp } from 'firebase/firestore'; 

async function createTestInitiative() {
  console.log('🧪 テスト用の施策データを1件作成します...');
  
  try {
    // 1. メイン施策データを作成
    const initiativeData = {
      title: "テスト施策 - Timestampエラー検証用",
      category: "SYSTEM_IMPROVEMENT", // 英語で
      status: "IN_PROGRESS", // 英語で
      priority: "HIGH", // 英語で
      assignee: "テスト担当者",
      dueDate: Timestamp.fromDate(new Date("2024-12-31")),
      currentVersion: 1,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    console.log('📝 施策データ:', JSON.stringify(initiativeData, null, 2));
    
    const initiativeRef = await addDoc(collection(db, 'initiatives'), initiativeData);
    console.log('✅ 施策作成完了:', initiativeRef.id);
    
    // 2. バージョン履歴データを作成
    const versionData = {
      initiativeId: initiativeRef.id,
      version: 1,
      issue: "テスト課題: Timestampエラーの原因究明",
      cause: "テスト原因: Firestoreデータの型変換問題",
      action: "テストアクション: 段階的なデバッグ実施",
      result: "テスト結果: データ構造とTimestamp処理の確認",
      status: "IN_PROGRESS", // 英語で
      priority: "HIGH", // 英語で
      assignee: "テスト担当者",
      dueDate: Timestamp.fromDate(new Date("2024-12-31")),
      changeReason: "初回作成",
      createdAt: Timestamp.now(),
      createdBy: "テストスクリプト"
    };
    
    console.log('📝 バージョンデータ:', JSON.stringify(versionData, null, 2));
    
    const versionRef = await addDoc(collection(db, 'initiative_versions'), versionData);
    console.log('✅ バージョン作成完了:', versionRef.id);
    
    console.log('🎉 テストデータ作成完了！');
    console.log(`💡 施策ID: ${initiativeRef.id}`);
    console.log(`💡 バージョンID: ${versionRef.id}`);
    
  } catch (error) {
    console.error('❌ テストデータ作成エラー:', error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  createTestInitiative()
    .then(() => {
      console.log('✨ テストデータ作成が正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 テストデータ作成でエラーが発生しました:', error);
      process.exit(1);
    });
}

export { createTestInitiative }; 