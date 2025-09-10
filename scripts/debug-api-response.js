const fetch = require('node-fetch');

async function testAPI() {
  console.log('=== API レスポンス確認 ===');
  
  const baseUrl = 'http://localhost:3002'; // 開発サーバーのURL
  
  // テストケース1: SNS運用 + Indeed + Engage
  console.log('\n🧪 テストケース1: SNS運用 + Indeed + Engage');
  try {
    const url1 = `${baseUrl}/api/recruitment/optimized-weekly-summaries?jobCategory=SNS運用&mediaSources=indeed,engage&year=2025&weekNumber=23&limit=10`;
    console.log('URL:', url1);
    
    const response1 = await fetch(url1);
    const data1 = await response1.json();
    
    console.log('レスポンス:', JSON.stringify(data1, null, 2));
  } catch (error) {
    console.error('エラー:', error.message);
  }
  
  // テストケース2: 過去4週分のデータ取得
  console.log('\n🧪 テストケース2: 過去4週分のデータ取得');
  for (let week = 20; week <= 23; week++) {
    try {
      const url = `${baseUrl}/api/recruitment/optimized-weekly-summaries?jobCategory=SNS運用&mediaSources=indeed,engage&year=2025&weekNumber=${week}&limit=10`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        const summary = data.data[0];
        console.log(`  2025-W${week.toString().padStart(2, '0')}: 応募${summary.displayMetrics?.applications || 0}件, 面接${summary.displayMetrics?.interviews || 0}件, 採用${summary.displayMetrics?.hires || 0}件`);
      } else {
        console.log(`  2025-W${week.toString().padStart(2, '0')}: データなし`);
      }
    } catch (error) {
      console.log(`  2025-W${week.toString().padStart(2, '0')}: エラー - ${error.message}`);
    }
  }
}

testAPI().catch(console.error); 