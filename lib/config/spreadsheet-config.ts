// Google Sheets設定の一元管理
export const SPREADSHEET_CONFIG = {
  // メイン採用管理スプレッドシート
  MAIN_RECRUITMENT: {
    id: process.env.MAIN_RECRUITMENT_SPREADSHEET_ID!,
    name: 'メイン採用管理',
    description: '職種別の採用管理シート（SNS運用、動画クリエイター、AIライター、撮影スタッフ）',
  },
  
  // Googleフォーム提出スプレッドシート
  GOOGLE_FORM_SUBMISSION: {
    id: process.env.GOOGLE_FORM_SUBMISSION_SPREADSHEET_ID!,
    name: 'Googleフォーム提出',
    description: '応募フォームからの自動格納データ',
  },
} as const;

// 職種とシート名のマッピング（動的取得を基本とするが、フォールバック用）
export const JOB_CATEGORY_SHEET_MAPPING = {
  'SNS運用': 'SNS運用',
  '動画クリエイター': '動画クリエイター', 
  'AIライター': 'AIライター',
  '撮影スタッフ': '撮影スタッフ',
} as const;

// 列のマッピング設定
export const SHEET_COLUMN_MAPPING = {
  // 基本的な列構成（A列から順番）
  STANDARD_COLUMNS: {
    NAME: 0,           // A列: 氏名
    EMAIL: 1,          // B列: メールアドレス
    PHONE: 2,          // C列: 電話番号
    APPLICATION_DATE: 3, // D列: 応募日
    STATUS: 4,         // E列: 選考ステータス
    DOCUMENT_DATE: 5,  // F列: 書類提出日
    INTERVIEW_DATE: 6, // G列: 面接日
    HIRE_DATE: 7,      // H列: 採用日
    REJECTION_REASON: 8, // I列: 不採用理由
    NOTES: 9,          // J列: 備考
  },
  
  // ヘッダー行の期待値
  EXPECTED_HEADERS: [
    '氏名',
    'メールアドレス',
    '電話番号', 
    '応募日',
    '選考ステータス',
    '書類提出日',
    '面接日',
    '採用日',
    '不採用理由',
    '備考'
  ],
} as const;

// データ検証設定
export const VALIDATION_CONFIG = {
  // 必須フィールド
  REQUIRED_FIELDS: ['氏名', 'メールアドレス', '応募日', '選考ステータス'],
  
  // ステータスの有効値
  VALID_STATUSES: ['応募', '書類提出', '面接', '採用', '不採用', '辞退'],
  
  // 不採用理由の有効値
  VALID_REJECTION_REASONS: ['経験者', '高齢', '不適合', '外国籍', 'その他'],
  
  // 日付形式のパターン
  DATE_PATTERNS: [
    /^\d{4}\/\d{1,2}\/\d{1,2}$/,  // YYYY/MM/DD
    /^\d{4}-\d{1,2}-\d{1,2}$/,   // YYYY-MM-DD
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,  // MM/DD/YYYY
  ],
} as const;

// 同期設定
export const SYNC_CONFIG = {
  // バッチサイズ
  BATCH_SIZE: 100,
  
  // リトライ設定
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // ms
  
  // レート制限
  RATE_LIMIT_DELAY: 100, // ms between requests
} as const; 