import { getSpreadsheetSheetNames } from '../lib/integrations/google-sheets';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testSheetNames() {
  const spreadsheetId = process.env.MAIN_RECRUITMENT_SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.error('MAIN_RECRUITMENT_SPREADSHEET_ID が設定されていません。\n.env.localファイルにこの変数が正しく設定されていることを確認してください。');
    return;
  }
  try {
    console.log(`スプレッドシートID: ${spreadsheetId} のシート名を取得中...`);
    const sheetNames = await getSpreadsheetSheetNames(spreadsheetId);
    console.log('取得したシート名:', sheetNames);
  } catch (error) {
    console.error('シート名取得エラー:', error);
    if (error instanceof Error) {
      console.error('エラー詳細:', error.message);
    }
  }
}

testSheetNames(); 