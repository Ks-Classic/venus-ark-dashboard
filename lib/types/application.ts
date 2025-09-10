import { Timestamp } from 'firebase-admin/firestore';
import { ApplicationStatus, RejectionReason, JobCategory } from './enums';

// Re-export enums for use in other modules
export { ApplicationStatus, RejectionReason, JobCategory };

// ==================== Type Definitions ====================

// 採用媒体
export enum Source {
  INDEED = 'indeed',
  ENGAGE = 'engage',
  OTHER = 'other',
}

// 面接情報
export interface Interview {
  date: Timestamp;
  result: string;
}

// 選考プロセス情報
export interface SelectionProcess {
  status: ApplicationStatus;
  history: { status: ApplicationStatus; date: Timestamp }[];
  interviews: Interview[];
}

// 採用媒体の型定義
export type MediaSource = 'indeed' | 'engage' | 'other';

// Indeed分析データの型定義
export interface IndeedData {
  impressions?: number;        // 表示回数
  clicks?: number;            // クリック数
  cost?: number;              // 広告費
}

// 採用応募データのメインインターフェース
export interface Application {
  // 基本情報
  id: string;                    // Firestore自動生成ID
  sourceSheetId: string;         // 元のGoogle SheetのID
  sourceRowIndex: number;        // 元の行番号（トレーサビリティ用）
  
  // 応募者情報
  applicantName: string;         // 応募者氏名
  normalizedName: string;        // 名寄せ用正規化氏名
  email: string;                 // メールアドレス
  phone?: string;                // 電話番号
  
  // 職種・応募情報
  jobCategory: JobCategory;      // 職種
  mediaSource: MediaSource;      // 採用媒体
  applicationDate: string;       // 応募日 (YYYY-MM-DD)
  applicationWeek: string;       // 応募週 (YYYY-WW) 集計用
  
  // 選考プロセス
  status: ApplicationStatus;     // 現在のステータス
  documentSubmitDate?: string;   // 書類提出日
  interviewDate?: string;        // 面談予定日/面接日
  interviewImplementedDate?: string; // 面談実施日
  hireDate?: string;            // 採用日
  acceptanceDate?: string;      // 内定受諾日
  declineDate?: string;         // 辞退日
  
  // 不採用情報
  rejectionReason?: RejectionReason; // 不採用理由
  rejectionDetail?: string;      // 不採用詳細理由
  
  // 応募フォーム関連
  formSubmissionTimestamp?: string; // 応募フォームのタイムスタンプ
  
  // 週キー（各段階の週を集約した配列）
  activeWeeks?: string[];
  
  // Indeed分析データ
  indeedData?: IndeedData;
  
  // メタデータ
  createdAt: Timestamp;
  updatedAt: Timestamp;
  syncedAt: Timestamp;          // 最終同期日時
}

// Google Sheetsから取得する生データの型定義
export interface RawSheetData {
  [key: string]: string | number | undefined;
  '応募日'?: string;
  '氏名'?: string;
  'メールアドレス'?: string;
  'ステータス'?: string;
  '書類提出日'?: string;
  '面接日'?: string;
  '採用日'?: string;
  '不採用理由'?: string;
}

// データ変換用のヘルパー型
export interface ApplicationInput {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobCategory: JobCategory;
  source: Source;
  applicationDate: Timestamp | null;
  formSubmissionTimestamp: Timestamp;
  status: ApplicationStatus;
  selectionProcess: SelectionProcess;
  rejectionReason?: RejectionReason;
  rejectionDetails?: string;
  isDuplicate: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sourceInfo: {
    sheetId: string;
    sheetName: string;
    rowIndex: number;
  };
  documentScreener: string;
  interviewer: string[];
  // 追加: 各段階の日付
  documentSubmitDate?: Timestamp | null;
  interviewDate?: Timestamp | null;
  interviewImplementedDate?: Timestamp | null;
  offerDate?: Timestamp | null;
  hireDate?: Timestamp | null;
  acceptanceDate?: Timestamp | null;
  declineDate?: Timestamp | null;
  // 集計のための週キー配列
  activeWeeks?: string[];
  notes: string;
}

// 週次集計用の型定義
export interface WeeklyApplicationMetrics {
  week: string;                  // YYYY-WW形式
  jobCategory: JobCategory;
  applications: number;          // 応募数
  documents: number;            // 書類提出数
  interviews: number;           // 面接数
  hires: number;               // 採用数
  rejections: number;          // 不採用数
  withdrawals: number;         // 辞退数
  
  // 不採用理由別内訳
  rejectionBreakdown: {
    [key in RejectionReason]: number;
  };
  
  // 計算値
  interviewRate: number;       // 面接実施率 (面接数/応募数)
  hireRate: number;           // 採用率 (採用数/面接数)
  acceptanceRate: number;     // 内定受諾率 (採用数/(採用数+辞退数))
}

// Indeed月次分析データの型定義
export interface IndeedMonthlyMetrics {
  month: string;               // YYYY-MM形式
  jobCategory: JobCategory;
  impressions: number;         // 表示回数
  clicks: number;             // クリック数
  cost: number;              // 広告費
  applications: number;       // 応募数
  interviews: number;         // 面接数
  hires: number;             // 採用数
  rejections: number;        // 不採用数
  withdrawals: number;       // 辞退数
  actualStarts: number;      // 実稼働数
  
  // 計算値
  ctr: number;               // クリック率 (clicks/impressions)
  cpc: number;               // クリック単価 (cost/clicks)
  costPerApplication: number; // 応募単価 (cost/applications)
  costPerHire: number;       // 採用単価 (cost/hires)
  applicationRate: number;   // 応募率 (applications/clicks)
  interviewRate: number;     // 面接率 (interviews/applications)
  hireRate: number;         // 採用率 (hires/interviews)
  acceptanceRate: number;   // 内定受諾率
  actualStartRate: number;  // 実稼働率 (actualStarts/hires)
}