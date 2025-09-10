import { getSpreadsheetSheetNames, getSheetData } from '../lib/integrations/google-sheets';
import { appendToLog } from '../lib/logger';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function getSheetHeaders() {
  appendToLog('--- [DEBUG] スプレッドシートのヘッダー取得開始 ---');
  
  const spreadsheetId = process.env.MAIN_RECRUITMENT_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('環境変数 MAIN_RECRUITMENT_SPREADSHEET_ID が設定されていません');
  }
  appendToLog(`対象スプレッドシートID: ${spreadsheetId}`);

  let allSheetNames: string[] = [];
  try {
    allSheetNames = await getSpreadsheetSheetNames(spreadsheetId);
  } catch (error) {
    throw new Error(`スプレッドシートのシート名取得に失敗しました: ${error instanceof Error ? error.message : error}`);
  }

  const targetSheets = allSheetNames.filter(name => 
    name.includes('応募者管理') && (name.includes('indeed') || name.includes('engage'))
  );

  if (targetSheets.length === 0) {
    appendToLog('処理対象のシートが見つかりませんでした。');
    return;
  }
  
  console.log('--- 取得したヘッダー情報 ---');
  for (const sheetName of targetSheets) {
    try {
      // 各シートの1行目のみを取得
      const headerData = await getSheetData(spreadsheetId, `'${sheetName}'!1:1`);
      if (headerData && headerData.length > 0) {
        console.log(`\n[シート名]: ${sheetName}`);
        console.log(`[ヘッダー]:`, headerData[0]);
        // 特に '応募日' が含まれているかを確認
        const hasDateColumn = headerData[0].includes('応募日');
        console.log(` -> '応募日' 列の存在: ${hasDateColumn ? '✅ あり' : '❌ なし'}`);
      } else {
        console.log(`\n[シート名]: ${sheetName}`);
        console.log(` -> ヘッダーが取得できませんでした。`);
      }
    } catch (error) {
      console.error(`シート「${sheetName}」のヘッダー取得中にエラー:`, error);
    }
  }
  console.log('--------------------------');
}

getSheetHeaders().catch(error => {
  console.error('スクリプトの実行に失敗しました:', error);
  process.exit(1);
});