import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { JobCategory, MediaSource } from '../types/optimized-weekly-summary';
import { loadSheetsMapping } from '../utils/mapping-loader';

// Google Sheets API クライアントを初期化する関数
function initializeGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');

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

// Google Sheets列名マッピングを取得
let sheetsMapping: any = null;
async function getSheetsMapping() {
  if (!sheetsMapping) {
    sheetsMapping = await loadSheetsMapping();
  }
  return sheetsMapping;
}

// 列名を取得するヘルパー関数
async function getColumnName(key: string): Promise<string> {
  const mapping = await getSheetsMapping();
  return mapping.recruitment_sheets?.common_columns?.[key] || key;
}

// 列名の代替パターンを考慮した値取得
async function getValueFromRow(rowData: { [key: string]: any }, key: string): Promise<string> {
  const mapping = await getSheetsMapping();
  const primaryColumn = mapping.recruitment_sheets?.common_columns?.[key];
  const aliases = mapping.column_aliases?.[key] || [];
  
  // 主要列名で検索
  if (primaryColumn && rowData[primaryColumn]) {
    return rowData[primaryColumn].toString().trim();
  }
  
  // 代替パターンで検索
  for (const alias of aliases) {
    if (rowData[alias]) {
      return rowData[alias].toString().trim();
    }
  }
  
  return '';
}

/**
 * 媒体情報を含む応募データ
 */
export interface ApplicationDataWithSource {
  applicantName: string;
  email?: string;
  applicationDate: string;      // YYYY-MM-DD
  jobCategory: JobCategory;
  mediaSource: MediaSource;     // 媒体情報
  status: string;
  rejectionReason?: string;
  rejectionDetail?: string;
  interviewDate?: string;
  hireDate?: string;
  acceptanceDate?: string;
  sourceSheetName: string;      // 元シート名
  sourceRowIndex: number;       // 元行番号
}

/**
 * 職種と媒体のシートマッピング定義
 */
const SHEET_MAPPINGS: Array<{
  jobCategory: JobCategory;
  mediaSource: MediaSource;
  sheetNamePatterns: string[];
}> = [
  // SNS運用
  {
    jobCategory: 'SNS運用',
    mediaSource: 'indeed',
    sheetNamePatterns: ['indeed応募者管理(SNS運用)']
  },
  {
    jobCategory: 'SNS運用',
    mediaSource: 'engage',
    sheetNamePatterns: ['engageその他応募者管理(SNS運用)']
  },
  
  // 動画クリエイター（職種名修正）
  {
    jobCategory: '動画クリエイター',
    mediaSource: 'indeed',
    sheetNamePatterns: ['indeed応募者管理(動画編集)']
  },
  {
    jobCategory: '動画クリエイター',
    mediaSource: 'engage',
    sheetNamePatterns: ['engageその他応募者管理(動画編集)']
  },
  
  // AIライター
  {
    jobCategory: 'AIライター',
    mediaSource: 'indeed',
    sheetNamePatterns: ['indeed応募者管理(ライター/AIライター)']
  },
  {
    jobCategory: 'AIライター',
    mediaSource: 'engage',
    sheetNamePatterns: ['engageその他応募者管理(ライター/AIライター)']
  },
  
  // 撮影スタッフ
  {
    jobCategory: '撮影スタッフ',
    mediaSource: 'indeed',
    sheetNamePatterns: ['indeed応募者管理(撮影スタッフ) ']
  },
  {
    jobCategory: '撮影スタッフ',
    mediaSource: 'engage',
    sheetNamePatterns: ['engageその他応募者管理(撮影スタッフ) ']
  }
];

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
    obj._rowIndex = index + 2; // ヘッダー行を考慮して+2
    return obj;
  });
}

/**
 * 行データを標準化されたApplicationDataWithSourceに変換する
 */
export async function normalizeRowData(
  rowData: { [key: string]: any },
  jobCategory: JobCategory,
  mediaSource: MediaSource,
  sheetName: string,
  sourceRowIndex: number
): Promise<ApplicationDataWithSource | null> {
  try {
    // 必須フィールドの確認（マッピングファイルから取得）
    const applicantName = await getValueFromRow(rowData, 'applicant_name');
    const applicationDateRaw = await getValueFromRow(rowData, 'application_date');
    
    if (!applicantName || !applicationDateRaw) {
      return null; // 必須フィールドが空の場合はスキップ
    }
    
    // 日付の正規化
    const applicationDate = normalizeDate(applicationDateRaw);
    if (!applicationDate) {
      return null;
    }
    
    // ステータスの正規化（マッピングファイルから取得）
    const status = await getValueFromRow(rowData, 'status');
    
    // 名前の正規化（スペース除去、カタカナ統一など）
    const normalizedName = applicantName
      .replace(/\s+/g, '')
      .replace(/[ァ-ヴ]/g, (match: string) => String.fromCharCode(match.charCodeAt(0) + 0x60));
    
    // メールアドレスの取得（マッピングファイルから取得）
    const email = await getValueFromRow(rowData, 'email');
    
    // その他のフィールドも外部化されたマッピングから取得
    const rejectionReason = await getValueFromRow(rowData, 'rejection_reason');
    const rejectionDetail = await getValueFromRow(rowData, 'rejection_detail');
    const interviewDateRaw = await getValueFromRow(rowData, 'interview_date');
    const hireDateRaw = await getValueFromRow(rowData, 'hire_date');
    const acceptanceDateRaw = await getValueFromRow(rowData, 'acceptance_date');
    
    return {
      applicantName: normalizedName,
      email,
      applicationDate,
      jobCategory,
      mediaSource,
      status: status || '応募',
      rejectionReason,
      rejectionDetail,
      interviewDate: normalizeDate(interviewDateRaw),
      hireDate: normalizeDate(hireDateRaw),
      acceptanceDate: normalizeDate(acceptanceDateRaw),
      sourceSheetName: sheetName,
      sourceRowIndex
    };
  } catch (error) {
    console.error(`行データの正規化でエラー (行${sourceRowIndex}):`, error);
    return null;
  }
}

/**
 * 日付文字列を YYYY-MM-DD 形式に正規化する
 */
function normalizeDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  
  try {
    // 様々な日付形式に対応
    const date = new Date(dateStr.replace(/\//g, '-'));
    if (isNaN(date.getTime())) return undefined;
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return undefined;
  }
}

/**
 * 特定の職種・媒体の組み合わせからデータを取得する
 */
export async function getJobCategorySourceData(
  spreadsheetId: string,
  jobCategory: JobCategory,
  mediaSource: MediaSource
): Promise<ApplicationDataWithSource[]> {
  try {
    // シート名一覧を取得
    const sheetNames = await getSpreadsheetSheetNames(spreadsheetId);
    
    // 対応するシートマッピングを検索
    const mapping = SHEET_MAPPINGS.find(
      m => m.jobCategory === jobCategory && m.mediaSource === mediaSource
    );
    
    if (!mapping) {
      console.warn(`職種「${jobCategory}」・媒体「${mediaSource}」のマッピングが見つかりません`);
      return [];
    }
    
    // シート名の完全一致を確認
    const targetSheet = sheetNames.find(name => 
      mapping.sheetNamePatterns.some(pattern => name === pattern)
    );
    
    if (!targetSheet) {
      console.warn(`職種「${jobCategory}」・媒体「${mediaSource}」に対応するシートが見つかりません。利用可能なシート: ${sheetNames.join(', ')}`);
      return [];
    }
    
    console.log(`職種「${jobCategory}」・媒体「${mediaSource}」のデータを「${targetSheet}」シートから取得中...`);
    
    // シートデータを取得
    const rawData = await getSheetData(spreadsheetId, `${targetSheet}!A:Z`);
    
    if (rawData.length === 0) {
      console.warn(`シート「${targetSheet}」にデータがありません`);
      return [];
    }
    
    // オブジェクト形式に変換
    const objectData = convertArrayToObjects(rawData);
    
    // 標準化されたデータに変換
    const normalizedData: ApplicationDataWithSource[] = [];
    
    for (let i = 0; i < objectData.length; i++) {
      const normalized = await normalizeRowData(
        objectData[i],
        jobCategory,
        mediaSource,
        targetSheet,
        objectData[i]._rowIndex
      );
      
      if (normalized) {
        normalizedData.push(normalized);
      }
    }
    
    console.log(`職種「${jobCategory}」・媒体「${mediaSource}」: ${normalizedData.length}件のデータを取得しました`);
    
    return normalizedData;
    
  } catch (error) {
    console.error(`職種「${jobCategory}」・媒体「${mediaSource}」のデータ取得に失敗:`, error);
    throw error;
  }
}

/**
 * すべての職種・媒体の組み合わせからデータを取得する
 */
export async function getAllOptimizedJobCategoryData(spreadsheetId?: string): Promise<ApplicationDataWithSource[]> {
  const targetSpreadsheetId = spreadsheetId || 
    process.env.MAIN_RECRUITMENT_SPREADSHEET_ID || 
    extractSpreadsheetId(process.env.RECRUITMENT_SPREADSHEET_URL || '');
  
  if (!targetSpreadsheetId) {
    throw new Error('スプレッドシートIDが取得できません。MAIN_RECRUITMENT_SPREADSHEET_IDまたはRECRUITMENT_SPREADSHEET_URLを確認してください。');
  }
  
  console.log(`スプレッドシート ${targetSpreadsheetId} から全職種・媒体のデータを取得中...`);
  
  const allData: ApplicationDataWithSource[] = [];
  
  // 全ての職種・媒体の組み合わせを処理
  for (const mapping of SHEET_MAPPINGS) {
    try {
      const data = await getJobCategorySourceData(
        targetSpreadsheetId,
        mapping.jobCategory,
        mapping.mediaSource
      );
      allData.push(...data);
    } catch (error) {
      console.error(`職種「${mapping.jobCategory}」・媒体「${mapping.mediaSource}」のデータ取得でエラー:`, error);
      // エラーが発生してもスキップして続行
    }
  }
  
  console.log(`全職種・媒体のデータ取得完了: 合計 ${allData.length} 件`);
  
  return allData;
} 