// API エンドポイント直接テストスクリプト（詳細版）
const testAPIEndpoint = async () => {
  console.log('🔍 API エンドポイント直接テスト開始');
  
  const tests = [
    {
      name: 'W27 - 全職種',
      url: 'http://localhost:3002/api/recruitment/weekly-reports?weekIds=2025-W27'
    },
    {
      name: 'W27 - SNS運用',
      url: 'http://localhost:3002/api/recruitment/weekly-reports?weekIds=2025-W27&jobCategory=SNS運用'
    },
    {
      name: 'W27 - 年と週番号指定',
      url: 'http://localhost:3002/api/recruitment/weekly-reports?year=2025&weekNumber=27'
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n--- ${test.name} ---`);
      console.log(`URL: ${test.url}`);
      
      const response = await fetch(test.url);
      const text = await response.text();
      
      console.log(`Status: ${response.status}`);
      console.log(`Response Text: ${text}`);
      
      try {
        const data = JSON.parse(text);
        console.log('Parsed JSON:', data);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError.message);
      }
    } catch (error) {
      console.error('❌ Fetch Error:', error.message);
    }
  }
};

// 実行
testAPIEndpoint(); 