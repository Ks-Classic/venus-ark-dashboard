// APIレスポンスをテストするスクリプト

const https = require('https');
const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function testAPI() {
  try {
    console.log('=== APIレスポンステスト ===');
    console.log('8月2週目を選択した場合のレスポンス:');
    
    const response = await makeRequest('http://localhost:3002/api/work-status/weekly-detail?year=2025&month=8&week=2');
    
    console.log('レスポンス:', JSON.stringify(response, null, 2));
    
    // 週の詳細を確認
    if (response.weekDetails) {
      console.log('\n=== 週の詳細 ===');
      response.weekDetails.forEach((week, index) => {
        console.log(`${index + 1}番目の週: ${week.weekLabel}`);
        console.log(`  総稼働者数: ${week.totalWorkers}`);
        console.log(`  新規開始: ${week.newStarted}`);
        console.log(`  切替完了: ${week.switching}`);
        console.log(`  案件終了: ${week.projectEnded}`);
        console.log(`  契約終了: ${week.contractEnded}`);
        console.log(`  カウンセリング開始: ${week.counselingStarted}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('APIリクエストエラー:', error.message);
  }
}

testAPI();
