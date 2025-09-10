const fetch = require('node-fetch');

async function testAPI() {
  try {
    const url = 'http://localhost:3002/api/recruitment/weekly-reports?weekIds=2025-W25&weekIds=2025-W26&weekIds=2025-W27&weekIds=2025-W28&reportType=recruitment';
    
    console.log('📡 APIテスト開始:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 レスポンス:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 レスポンスデータ:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data) {
        console.log(`\n✅ 取得データ数: ${data.data.length}件`);
        data.data.forEach((item, index) => {
          console.log(`[${index}] Week ${item.year}-W${String(item.weekNumber).padStart(2, '0')}:`);
          console.log(`  - applications: ${item.recruitmentMetrics?.applications || 0}`);
          console.log(`  - documents: ${item.recruitmentMetrics?.documents || 0}`);
          console.log(`  - interviews: ${item.recruitmentMetrics?.interviews || 0}`);
          console.log(`  - hires: ${item.recruitmentMetrics?.hires || 0}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.error('❌ APIエラー:', errorText);
    }
    
  } catch (error) {
    console.error('❌ 接続エラー:', error.message);
  }
}

testAPI(); 