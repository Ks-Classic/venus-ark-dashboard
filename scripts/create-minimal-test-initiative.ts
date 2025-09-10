import { db } from '../lib/firebase/client';
import { collection, addDoc, Timestamp } from 'firebase/firestore'; 

async function createMinimalTestInitiative() {
  console.log('🧪 最小限のテストデータで問題フィールドを特定します...');
  
  try {
    // テスト1: 基本的なフィールドのみ
    console.log('📝 テスト1: 基本フィールドのみ');
    const basicData = {
      title: "基本テスト",
      createdAt: Timestamp.now()
    };
    
    console.log('データ:', JSON.stringify(basicData, null, 2));
    const basicRef = await addDoc(collection(db, 'initiatives'), basicData);
    console.log('✅ 基本テスト成功:', basicRef.id);
    
    // テスト2: enum フィールド追加
    console.log('📝 テスト2: enum フィールド追加');
    const enumData = {
      title: "Enumテスト",
      category: "SYSTEM_IMPROVEMENT",
      status: "IN_PROGRESS", 
      priority: "HIGH",
      createdAt: Timestamp.now()
    };
    
    console.log('データ:', JSON.stringify(enumData, null, 2));
    const enumRef = await addDoc(collection(db, 'initiatives'), enumData);
    console.log('✅ Enumテスト成功:', enumRef.id);
    
    // テスト3: 日付フィールド追加
    console.log('📝 テスト3: 日付フィールド追加');
    const dateData = {
      title: "日付テスト",
      category: "SYSTEM_IMPROVEMENT",
      status: "IN_PROGRESS", 
      priority: "HIGH",
      dueDate: Timestamp.fromDate(new Date("2024-12-31")),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    console.log('データ:', JSON.stringify(dateData, null, 2));
    const dateRef = await addDoc(collection(db, 'initiatives'), dateData);
    console.log('✅ 日付テスト成功:', dateRef.id);
    
    // テスト4: 数値フィールド追加
    console.log('📝 テスト4: 数値フィールド追加');
    const numberData = {
      title: "数値テスト",
      category: "SYSTEM_IMPROVEMENT",
      status: "IN_PROGRESS", 
      priority: "HIGH",
      currentVersion: 1,
      dueDate: Timestamp.fromDate(new Date("2024-12-31")),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    console.log('データ:', JSON.stringify(numberData, null, 2));
    const numberRef = await addDoc(collection(db, 'initiatives'), numberData);
    console.log('✅ 数値テスト成功:', numberRef.id);
    
    // テスト5: 文字列フィールド追加
    console.log('📝 テスト5: 文字列フィールド追加');
    const stringData = {
      title: "文字列テスト",
      category: "SYSTEM_IMPROVEMENT",
      status: "IN_PROGRESS", 
      priority: "HIGH",
      assignee: "テスト担当者",
      currentVersion: 1,
      dueDate: Timestamp.fromDate(new Date("2024-12-31")),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    console.log('データ:', JSON.stringify(stringData, null, 2));
    const stringRef = await addDoc(collection(db, 'initiatives'), stringData);
    console.log('✅ 文字列テスト成功:', stringRef.id);
    
    console.log('🎉 すべてのテストが成功しました！');
    
  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error);
    console.error('エラーの詳細:', JSON.stringify(error, null, 2));
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  createMinimalTestInitiative()
    .then(() => {
      console.log('✨ 最小限テストが正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 最小限テストでエラーが発生しました:', error);
      process.exit(1);
    });
}

export { createMinimalTestInitiative }; 