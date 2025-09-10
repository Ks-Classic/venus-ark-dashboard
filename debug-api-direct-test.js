const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testWeeklyReportsAPI() {
  try {
    console.log('🔍 週次レポートAPIのテスト開始');
    
    // テストケース1: 単一週のテスト
    console.log('\n=== テストケース1: 単一週 ===');
    const response1 = await fetch('http://localhost:3000/api/recruitment/weekly-reports?weeks=2025-W27');
    const data1 = await response1.json();
    console.log('📊 レスポンス:', JSON.stringify(data1, null, 2));
    
    // テストケース2: 複数週のテスト
    console.log('\n=== テストケース2: 複数週 ===');
    const response2 = await fetch('http://localhost:3000/api/recruitment/weekly-reports?weeks=2025-W25,2025-W27');
    const data2 = await response2.json();
    console.log('📊 レスポンス:', JSON.stringify(data2, null, 2));
    
    // テストケース3: 職種フィルタのテスト
    console.log('\n=== テストケース3: 職種フィルタ ===');
    const response3 = await fetch('http://localhost:3000/api/recruitment/weekly-reports?weeks=2025-W27&jobCategory=SNS_MANAGEMENT');
    const data3 = await response3.json();
    console.log('📊 レスポンス:', JSON.stringify(data3, null, 2));
    
    // テストケース4: エラーハンドリングのテスト
    console.log('\n=== テストケース4: 存在しない週 ===');
    const response4 = await fetch('http://localhost:3000/api/recruitment/weekly-reports?weeks=2025-W99');
    const data4 = await response4.json();
    console.log('📊 レスポンス:', JSON.stringify(data4, null, 2));
    
    console.log('\n✅ 週次レポートAPIテスト完了');
    
  } catch (error) {
    console.error('❌ APIテストエラー:', error);
  }
}

testWeeklyReportsAPI(); 