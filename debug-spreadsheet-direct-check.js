const { google } = require('googleapis');
const fs = require('fs');

// Google Sheets API設定
const SPREADSHEET_ID = '1wH8cFBL4qAKtdOdHRvqZPWZJgzJLjXLcBWRHGHfHa7U';
const SHEETS_TO_CHECK = [
  'Indeed応募者管理(SNS運用)',
  'engageその他応募者管理(SNS運用)',
  'Indeed応募者管理(動画クリエイター)',
  'engageその他応募者管理(動画クリエイター)',
  'Indeed応募者管理(AIライター)',
  'engageその他応募者管理(AIライター)',
  'Indeed応募者管理(撮影スタッフ)',
  'engageその他応募者管理(撮影スタッフ)'
];

async function checkSpreadsheetData() {
  try {
    console.log('🔍 スプレッドシートの直接確認開始');
    
    // 認証情報の設定
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 各シートの確認
    for (const sheetName of SHEETS_TO_CHECK) {
      console.log(`\n=== シート「${sheetName}」の確認 ===`);
      
      try {
        // ヘッダー行の確認
        const headerResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!A1:Z1`
        });
        
        const headers = headerResponse.data.values?.[0] || [];
        console.log('📋 ヘッダー:', headers.slice(0, 10)); // 最初の10列のみ表示
        
        // データ行数の確認
        const dataResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!A:A`
        });
        
        const totalRows = dataResponse.data.values?.length || 0;
        console.log('📊 総行数:', totalRows);
        
        // 最初の5行のデータ確認
        if (totalRows > 1) {
          const sampleResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A2:J6` // 2行目から6行目まで、A-J列
          });
          
          const sampleData = sampleResponse.data.values || [];
          console.log('📝 サンプルデータ (最初の5行):');
          sampleData.forEach((row, index) => {
            console.log(`  行${index + 2}:`, row.slice(0, 5)); // 最初の5列のみ表示
          });
        }
        
        // 応募日列の確認（通常A列）
        if (totalRows > 1) {
          const dateResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A2:A11` // 応募日列の最初の10行
          });
          
          const dates = dateResponse.data.values?.flat() || [];
          console.log('📅 応募日サンプル:', dates.filter(d => d).slice(0, 5));
        }
        
      } catch (error) {
        console.error(`❌ シート「${sheetName}」の確認エラー:`, error.message);
      }
    }
    
    console.log('\n✅ スプレッドシート直接確認完了');
    
  } catch (error) {
    console.error('❌ スプレッドシート確認エラー:', error);
  }
}

// 実行
checkSpreadsheetData(); 