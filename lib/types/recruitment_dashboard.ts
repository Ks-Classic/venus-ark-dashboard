// 採用ダッシュボード用の型定義

// 職種別タブ
export interface JobCategoryTab {
  id: 'sns' | 'video' | 'ai-writer' | 'photographer' | 'web-design' | 'all';
  label: string;
}

// 採用媒体フィルタ
export interface PlatformFilter {
  id: 'indeed' | 'engage' | 'other' | 'all';
  label: string;
}

// フィルタリング状態
export interface FilterState {
  jobCategory: string;
  platform: string;
  weekRange: {
    start: string;
    end: string;
  };
}

// 採用・集客テーブル行
export interface CollectionTableRow {
  label: string;
  values: {
    week3: number;
    week4: number;
    week5: number;
    week1: number;
    total: number;
  };
}

// 採用面接テーブル行
export interface InterviewTableRow {
  label: string;
  values: {
    week3: number;
    week4: number;
    week5: number;
    week1: number;
    total: number;
  };
}

// 不採用者内訳テーブル行
export interface RejectionTableRow {
  label: string;
  values: {
    week3: number;
    week4: number;
    week5: number;
    week1: number;
    total: number;
  };
}

// 実施率・受諾率テーブル行
export interface RateTableRow {
  label: string;
  values: {
    week3: string;
    week4: string;
    week5: string;
    week1: string;
    total: string;
  };
}

// 主要項目詳細
export interface DetailItem {
  id: string;
  title: string;           // ユーザー入力
  comment: string;         // ユーザー入力
  sourceData: {
    value: number;
    rowLabel: string;
    weekId: string;
    tableType: string;
  };
  order: number;           // 表示順序
  createdAt: Date;
  updatedAt: Date;
  // フィルタ情報
  jobCategory: string;
  platform: string;
}

// 詳細コメント
export interface DetailComment {
  id: string;
  detailItemId: string;
  weekId: string;
  jobCategory: string;
  platform: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// 定数定義
export const JOB_CATEGORY_TABS: JobCategoryTab[] = [
  { id: 'sns', label: 'SNS運用' },
  { id: 'video', label: '動画クリエイター' },
  { id: 'ai-writer', label: 'AIライター' },
  { id: 'photographer', label: '撮影スタッフ' },
  { id: 'web-design', label: 'WEBデザイン' },
  { id: 'all', label: '全職種' }
];

export const PLATFORM_FILTERS: PlatformFilter[] = [
  { id: 'indeed', label: 'Indeed' },
  { id: 'engage', label: 'Engage' },
  { id: 'other', label: 'その他' },
  { id: 'all', label: '全媒体' }
];

export const DEFAULT_FILTERS: FilterState = {
  jobCategory: 'all',
  platform: 'all',
  weekRange: {
    start: '2025-W01',
    end: '2025-W04'
  }
};

// 採用・集客テーブルの行定義
export const COLLECTION_ROWS: { key: string; label: string }[] = [
  { key: 'applications', label: '応募数' },
  { key: 'applicationRejections', label: '応募不採用数' },
  { key: 'applicationContinuing', label: '内選考継続数' },
  { key: 'documents', label: '書類提出数' },
  { key: 'documentRejections', label: '内不採用数' },
  { key: 'documentContinuing', label: '内選考継続数' },
];

// 採用面接テーブルの行定義
export const INTERVIEW_ROWS: { key: string; label: string }[] = [
  { key: 'interviewScheduled', label: '面接予定数' },
  { key: 'interviewImplemented', label: '内面接実施数' },
  { key: 'interviewPassed', label: '内面接評価数' },
  { key: 'hired', label: '採用者数' },
  { key: 'finalAcceptance', label: '内定受諾数' },
];

// 不採用者内訳テーブルの行定義
export const REJECTION_ROWS: { key: string; label: string }[] = [
  { key: 'experienced', label: '経験者' },
  { key: 'elderly', label: '高齢' },
  { key: 'unsuitable', label: '不適合' },
  { key: 'foreign', label: '外国籍' },
];

// 実施率・受諾率テーブルの行定義
export const RATE_ROWS: { key: string; label: string }[] = [
  { key: 'implementationRate', label: '面接実施率（対面接予定数）' },
  { key: 'acceptanceRate', label: '内定受諾率（対採用者数）' },
]; 

// 既存の型定義
export interface RecruitmentDashboardFilters {
  jobCategory: string;
  platform: string;
  weekRange: {
    start: string;
    end: string;
  };
}

export interface RecruitmentMetrics {
  applications: number;
  applicationRejections: number;
  applicationContinuing: number;
  documents: number;
  documentRejections: number;
  documentContinuing: number;
  interviewScheduled: number;
  interviewWithdrawals: number;
  interviews: number;
  hires: number;
  acceptances: number;
  rejections: number;
  withdrawals: number;
}

export interface InterviewMetrics {
  interviewScheduled: number;
  interviewImplemented: number;
  interviewPassed: number;
  hired: number;
  finalAcceptance: number;
  implementationRate: number;
  acceptanceRate: number;
}

export interface RejectionMetrics {
  experienced: number;
  elderly: number;
  unsuitable: number;
  foreign: number;
  other: number;
}

// 新しい型定義 - 主要項目詳細関連
export interface CellData {
  value: number;
  rowLabel: string;
  weekId: string;
  tableType: 'collection' | 'interview' | 'rejection' | 'rate';
  coordinates: { row: number; col: number };
}

export interface DetailItem {
  id: string;
  title: string;           // ユーザー入力
  comment: string;         // ユーザー入力
  sourceData: {
    value: number;
    rowLabel: string;
    weekId: string;
    tableType: string;
  };
  order: number;           // 表示順序
  createdAt: Date;
  updatedAt: Date;
  // フィルタ情報
  jobCategory: string;
  platform: string;
}

export interface DetailItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; comment: string }) => void;
  initialData?: {
    title: string;
    comment: string;
    sourceData: CellData;
  };
  loading?: boolean;
}

export interface ClickableCell {
  value: number;
  rowLabel: string;
  weekId: string;
  tableType: 'collection' | 'interview' | 'rejection' | 'rate';
  onClick: (cellData: CellData) => void;
}

// 週選択関連
export interface WeekSelection {
  selectedWeeks: string[];  // ['2025-W25', '2025-W26', '2025-W27', '2025-W28']
  weekRange: {
    start: string;          // '2025-W25'
    end: string;            // '2025-W28'
  };
}

// 拡張されたフィルタ状態
export interface ExtendedFilterState {
  jobCategory: string;
  platform: string;
  weekRange: {
    start: string;
    end: string;
  };
  selectedWeeks: string[];
} 