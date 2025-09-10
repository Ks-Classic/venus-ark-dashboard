import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { JobCategory } from '../types/enums';
import { normalizeName } from '../data-processing/normalization';
import { Timestamp } from 'firebase-admin/firestore';
import { parseDate } from '../data-processing/validation';

// Google Sheets API クライアントを初期化する関数
function initializeGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Google Sheets API の環境変数が設定されていません');
  }

const auth = new JWT({
    email: clientEmail,
    key: privateKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

  return google.sheets({ version: 'v4', auth });
}

/**
 * スプレッドシートからデータを取得する
 */
export async function getSheetData(spreadsheetId: string, range: string = 'A:Z'): Promise<any[][]> {
  try {
    const sheets = initializeGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range,
    });
    return response.data.values || [];
  } catch (error) {
    console.error(`シートデータ取得エラー (${spreadsheetId}, ${range}):`, error);
    throw error;
  }
}

/**
 * スプレッドシートのシート名一覧を取得する
 */
export async function getSpreadsheetSheetNames(spreadsheetId: string): Promise<string[]> {
  try {
    const sheets = initializeGoogleSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
      fields: 'sheets.properties.title',
    });
    return response.data.sheets?.map((sheet: sheets_v4.Schema$Sheet) => sheet.properties?.title || '') || [];
  } catch (error) {
    console.error(`スプレッドシートのシート名取得エラー (${spreadsheetId}):`, error);
    throw error;
  }
}

/**
 * URLからスプレッドシートIDを抽出する
 */
export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * 職種カテゴリに対応するシート名を生成する
 */
export function generateSheetNameForJobCategory(jobCategory: JobCategory): string {
  // 職種名に「採用」を付けたシート名を生成
  return `${jobCategory}採用`;
}

/**
 * 職種カテゴリに対応するシート名を検索する（柔軟なマッチング）
 */
export function findSheetNameForJobCategory(sheetNames: string[], jobCategory: JobCategory): string | null {
  // 完全一致を最初に試す
  const exactMatch = generateSheetNameForJobCategory(jobCategory);
  if (sheetNames.includes(exactMatch)) {
    return exactMatch;
  }
  
  // 部分一致で検索
  const partialMatches = sheetNames.filter(name => 
    name.includes(jobCategory) || name.includes(jobCategory.replace('運用', ''))
  );
  
  if (partialMatches.length > 0) {
    return partialMatches[0];
  }
  
  return null;
}

/**
 * 配列データをオブジェクト形式に変換する（ヘッダー行を使用）
 */
export function convertArrayToObjects(data: any[][]): { [key: string]: any }[] {
  if (data.length < 2) {
    return [];
  }
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map((row, index) => {
    const obj: { [key: string]: any } = {};
    headers.forEach((header, colIndex) => {
      obj[header] = row[colIndex] || '';
    });
    // 行番号を追加（デバッグ用）
    obj._rowIndex = index + 2; // ヘッダー行を考慮して+2
    return obj;
  });
}

/**
 * 特定の職種の採用データを取得する
 */
export async function getJobCategoryData(
  spreadsheetId: string, 
  jobCategory: JobCategory
): Promise<{ [key: string]: any }[]> {
  try {
    // シート名一覧を取得
    const sheetNames = await getSpreadsheetSheetNames(spreadsheetId);
    
    // 職種に対応するシート名を検索
    const sheetName = findSheetNameForJobCategory(sheetNames, jobCategory);
    
    if (!sheetName) {
      console.warn(`職種「${jobCategory}」に対応するシートが見つかりません。利用可能なシート: ${sheetNames.join(', ')}`);
      return [];
    }
    
    console.log(`職種「${jobCategory}」のデータを「${sheetName}」シートから取得中...`);
    
    // シートデータを取得
    const rawData = await getSheetData(spreadsheetId, `${sheetName}!A:Z`);
    
    if (rawData.length === 0) {
      console.warn(`シート「${sheetName}」にデータがありません`);
      return [];
    }
    
    // オブジェクト形式に変換
    const objectData = convertArrayToObjects(rawData);
    
    console.log(`職種「${jobCategory}」: ${objectData.length}件のデータを取得しました`);
    
    return objectData;
    
  } catch (error) {
    console.error(`職種「${jobCategory}」のデータ取得に失敗:`, error);
    throw error;
  }
}

/**
 * 全職種の採用データを取得する
 */
export async function getAllJobCategoryData(spreadsheetId?: string): Promise<{ [key: string]: { [key: string]: any }[] }> {
  const targetSpreadsheetId = spreadsheetId || process.env.MAIN_RECRUITMENT_SPREADSHEET_ID || extractSpreadsheetId(process.env.RECRUITMENT_SPREADSHEET_URL || '');
  
  if (!targetSpreadsheetId) {
    throw new Error('スプレッドシートIDが取得できません。MAIN_RECRUITMENT_SPREADSHEET_IDまたはRECRUITMENT_SPREADSHEET_URLを確認してください。');
  }
  
  const jobCategories: JobCategory[] = [JobCategory.SNS_OPERATION, JobCategory.VIDEO_CREATOR, JobCategory.AI_WRITER, JobCategory.PHOTOGRAPHY_STAFF];
  const results: { [key: string]: { [key: string]: any }[] } = {};
  
  console.log(`スプレッドシート ${targetSpreadsheetId} から全職種のデータを取得中...`);
  
  for (const jobCategory of jobCategories) {
    try {
      const data = await getJobCategoryData(targetSpreadsheetId, jobCategory);
      results[jobCategory] = data;
    } catch (error) {
      console.error(`職種「${jobCategory}」のデータ取得でエラー:`, error);
      results[jobCategory] = [];
    }
  }
  
  const totalRecords = Object.values(results).reduce((sum, data) => sum + data.length, 0);
  console.log(`全職種のデータ取得完了: 合計 ${totalRecords} 件`);
  
  return results;
}

/**
 * スプレッドシートの基本情報を取得する（デバッグ用）
 */
export async function getSpreadsheetInfo(spreadsheetId: string): Promise<{
  title: string;
  sheets: Array<{ title: string; rowCount: number; columnCount: number }>;
}> {
  try {
    const sheets = initializeGoogleSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
      fields: 'properties.title,sheets.properties',
    });
    
    const title = response.data.properties?.title || 'Unknown';
    const sheetInfo = response.data.sheets?.map((sheet: sheets_v4.Schema$Sheet) => ({
      title: sheet.properties?.title || 'Unknown',
      rowCount: sheet.properties?.gridProperties?.rowCount || 0,
      columnCount: sheet.properties?.gridProperties?.columnCount || 0,
    })) || [];
    
    return { title, sheets: sheetInfo };
    
  } catch (error) {
    console.error(`スプレッドシート情報の取得に失敗 (${spreadsheetId}):`, error);
    throw error;
  }
}

/**
 * エントリーフォームのデータを取得し、正規化された氏名とタイムスタンプのマップを作成する
 * @returns Map<string, Timestamp> - キー: 正規化された氏名, 値: タイムスタンプ
 */
export async function getEntryFormTimestampMap(): Promise<Map<string, Timestamp>> {
  const spreadsheetId = process.env.ENTRY_FORM_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('環境変数 ENTRY_FORM_SPREADSHEET_ID が設定されていません');
  }

  // エントリーフォームは通常最初のシート
  const sheetData = await getSheetData(spreadsheetId);
  if (sheetData.length < 2) {
    console.warn('エントリーフォームシートにデータがありません。');
    return new Map();
  }

  const headers = sheetData[0];
  const timestampIndex = headers.indexOf('タイムスタンプ');
  const nameIndex = headers.indexOf('名前');

  if (timestampIndex === -1 || nameIndex === -1) {
    throw new Error(`エントリーフォームのヘッダーに「タイムスタンプ」または「氏名」が見つかりません。ヘッダー: ${headers.join(', ')}`);
  }

  const timestampMap = new Map<string, Timestamp>();
  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i];
    const name = row[nameIndex];
    const timestampStr = row[timestampIndex];

    if (name && timestampStr) {
      const normalized = normalizeName(name);
      const date = parseDate(timestampStr);
      if (date) {
        // 同じ名前の応募者がいた場合、新しい方（後からの応募）のタイムスタンプで上書きする
        timestampMap.set(normalized, Timestamp.fromDate(date));
      }
    }
  }

  console.log(`エントリーフォームから ${timestampMap.size} 件のタイムスタンプ情報を取得しました。`);
  return timestampMap;
}