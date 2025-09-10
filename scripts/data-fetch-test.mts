import { config } from 'dotenv';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { Client } from '@notionhq/client';

// .envファイルをロード
config({ path: '.env.local' });

// Google Sheets APIクライアントの初期化
const googleAuth = new JWT({
  email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth: googleAuth });

// Notion APIクライアントの初期化
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

async function fetchGoogleSheetData(spreadsheetId: string, sheetName?: string) {
  try {
    const range = sheetName ? `${sheetName}!A:Z` : 'A:Z';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range,
    });
    return response.data.values || [];
  } catch (error) {
    console.error(`Google Sheetデータ取得エラー (${spreadsheetId}, ${sheetName || '全シート'}):`, error);
    return null;
  }
}

async function fetchNotionDatabaseData(databaseId: string) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 5, // 最初の5件のみ取得
    });
    return response.results;
  } catch (error) {
    console.error(`Notion DBデータ取得エラー (${databaseId}):`, error);
    return null;
  }
}

async function getSpreadsheetSheetNames(spreadsheetId: string): Promise<string[]> {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
      fields: 'sheets.properties.title',
    });
    return response.data.sheets?.map((sheet: any) => sheet.properties?.title || '') || [];
  } catch (error) {
    console.error(`スプレッドシートのシート名取得エラー (${spreadsheetId}):`, error);
    return [];
  }
}

async function runDataFetchTest() {
  console.log('--- データ取得テスト開始 ---');

  // Google Sheets (メイン採用管理)
  const mainRecruitmentSheetId = process.env.MAIN_RECRUITMENT_SPREADSHEET_ID;
  if (mainRecruitmentSheetId) {
    console.log(`\n--- メイン採用管理スプレッドシート (${mainRecruitmentSheetId}) ---`);
    const sheetNames = await getSpreadsheetSheetNames(mainRecruitmentSheetId);
    if (sheetNames.length > 0) {
      for (const sheetName of sheetNames) {
        console.log(`  - シート名: ${sheetName}`);
        const data = await fetchGoogleSheetData(mainRecruitmentSheetId, sheetName);
        if (data && data.length > 0) {
          console.log('    [データサンプル (最初の5行)]:', data.slice(0, 5));
        } else {
          console.log('    [データなし、または取得失敗]');
        }
      }
    } else {
      console.log('  シート名が見つかりませんでした。');
    }
  } else {
    console.log('MAIN_RECRUITMENT_SPREADSHEET_ID が設定されていません。');
  }

  // Google Sheets (応募フォーム提出)
  const googleFormSubmissionSheetId = process.env.GOOGLE_FORM_SUBMISSION_SPREADSHEET_ID;
  if (googleFormSubmissionSheetId) {
    console.log(`\n--- Googleフォーム提出スプレッドシート (${googleFormSubmissionSheetId}) ---`);
    const data = await fetchGoogleSheetData(googleFormSubmissionSheetId);
    if (data && data.length > 0) {
      console.log('  [データサンプル (最初の5行)]:', data.slice(0, 5));
    } else {
      console.log('  [データなし、または取得失敗]');
    }
  } else {
    console.log('GOOGLE_FORM_SUBMISSION_SPREADSHEET_ID が設定されていません。');
  }

  // Notion DB (メンバーDB)
  const notionMemberDbId = process.env.NOTION_MEMBER_DB_ID;
  if (notionMemberDbId) {
    console.log(`\n--- Notion メンバーDB (${notionMemberDbId}) ---`);
    const data = await fetchNotionDatabaseData(notionMemberDbId);
    if (data && data.length > 0) {
      console.log('  [データサンプル (最初の5件のプロパティ)]:', data.map((item: any) => item.properties).slice(0, 5));
    } else {
      console.log('  [データなし、または取得失敗]');
    }
  } else {
    console.log('NOTION_MEMBER_DB_ID が設定されていません。');
  }

  // Notion DB (案件DB)
  const notionProjectDbId = process.env.NOTION_PROJECT_DB_ID;
  if (notionProjectDbId) {
    console.log(`\n--- Notion 案件DB (${notionProjectDbId}) ---`);
    const data = await fetchNotionDatabaseData(notionProjectDbId);
    if (data && data.length > 0) {
      console.log('  [データサンプル (最初の5件のプロパティ)]:', data.map((item: any) => item.properties).slice(0, 5));
    } else {
      console.log('  [データなし、または取得失敗]');
    }
  } else {
    console.log('NOTION_PROJECT_DB_ID が設定されていません。');
  }

  // Notion DB (面談議事録DB)
  const notionMeetingDbId = process.env.NOTION_MEETING_DB_ID;
  if (notionMeetingDbId) {
    console.log(`\n--- Notion 面談議事録DB (${notionMeetingDbId}) ---`);
    const data = await fetchNotionDatabaseData(notionMeetingDbId);
    if (data && data.length > 0) {
      console.log('  [データサンプル (最初の5件のプロパティ)]:', data.map((item: any) => item.properties).slice(0, 5));
    } else {
      console.log('  [データなし、または取得失敗]');
    }
  } else {
    console.log('NOTION_MEETING_DB_ID が設定されていません。');
  }

  // Notion DB (メンバー別案件状況管理DB)
  const notionMemberProjectStatusDbId = process.env.NOTION_MEMBER_PROJECT_STATUS_DB_ID;
  if (notionMemberProjectStatusDbId) {
    console.log(`\n--- Notion メンバー別案件状況管理DB (${notionMemberProjectStatusDbId}) ---`);
    const data = await fetchNotionDatabaseData(notionMemberProjectStatusDbId);
    if (data && data.length > 0) {
      console.log('  [データサンプル (最初の5件のプロパティ)]:', data.map((item: any) => item.properties).slice(0, 5));
    } else {
      console.log('  [データなし、または取得失敗]');
    }
  } else {
    console.log('NOTION_MEMBER_PROJECT_STATUS_DB_ID が設定されていません。');
  }

  console.log('--- データ取得テスト終了 ---');
}

runDataFetchTest(); 