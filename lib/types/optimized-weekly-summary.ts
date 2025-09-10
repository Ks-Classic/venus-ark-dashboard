// 最適化された週次集計データ型定義（Phase 2.5）
export type MediaSource = 'indeed' | 'engage' | 'other';
export type JobCategory = 'SNS運用' | '動画クリエイター' | 'AIライター' | '撮影スタッフ';

/**
 * 媒体・職種別の詳細集計データ
 */
export interface JobCategorySourceMetrics {
  // 応募活動：集客
  applications: number;           // 応募数
  rejected: number;              // 不採用数
  continuing: number;            // 継続中
  
  // 書類・面接プロセス
  documents: number;             // 書類提出数
  interviews: number;            // 面接数
  interviewsCompleted: number;   // 面接実施数
  interviewsDeclined: number;    // 面接辞退数
  
  // 採用結果
  hired: number;                 // 採用数
  accepted: number;              // 内定受諾数
  withdrawn: number;             // 辞退数
  
  // 不採用理由別内訳
  rejectionReasons: {
    experienced: number;         // 経験者
    elderly: number;            // 高齢
    unsuitable: number;         // 不適合
    foreign: number;            // 外国籍
    other: number;              // その他
  };
  
  // 計算済み変換率
  conversionRates: {
    applicationToInterview: number;    // 応募→面接率
    interviewToHire: number;          // 面接→採用率
    hireToAcceptance: number;         // 採用→受諾率
  };
}

/**
 * 最適化された週次サマリー（媒体別・職種別対応）
 */
export interface OptimizedWeeklySummary {
  id: string;                    // "2025-W22" 形式
  year: number;                  // 2025
  weekNumber: number;            // 22
  startDate: string;             // 週開始日 (土曜日) YYYY-MM-DD
  endDate: string;               // 週終了日 (金曜日) YYYY-MM-DD
  
  // 媒体・職種別詳細データ
  // [jobCategory][mediaSource] の二次元構造
  detailedMetrics: {
    [K in JobCategory]: {
      [M in MediaSource]?: JobCategorySourceMetrics;
    } & {
      total: JobCategorySourceMetrics;  // 職種合計（全媒体）
    };
  };
  
  // 全体サマリー（高速クエリ用）
  totals: {
    bySource: {
      [M in MediaSource]: JobCategorySourceMetrics;
    } & {
      all: JobCategorySourceMetrics;    // 全体合計
    };
    byJobCategory: {
      [K in JobCategory]: JobCategorySourceMetrics;
    };
  };
  
  // メタデータ
  lastUpdated: string;           // ISO string
  sourceDataCount: number;       // 元データ件数（検証用）
  syncedAt: string;             // 最終同期時刻
}

/**
 * フィルタリング用パラメータ
 */
export interface SummaryFilterOptions {
  jobCategory?: JobCategory;
  mediaSources?: MediaSource[];   // 複数選択可能
  year?: number;
  weekNumber?: number;
  limit?: number;
}

/**
 * フィルタリング結果
 */
export interface FilteredSummaryData {
  metrics: JobCategorySourceMetrics;
  breakdown: {
    [source in MediaSource]?: JobCategorySourceMetrics;
  };
  jobCategory: JobCategory;
  activeSources: MediaSource[];
}

/**
 * UI用の集計データ（リアルタイムフィルタリング後）
 */
export interface DisplayMetrics {
  applications: number;
  interviews: number;
  hires: number;
  conversionRate: number;        // 面接率
  hireRate: number;             // 採用率
  acceptanceRate: number;       // 受諾率
  
  // 媒体別内訳（フィルタ適用後）
  sourceBreakdown: {
    [source in MediaSource]?: {
      applications: number;
      interviews: number;
      hires: number;
      enabled: boolean;         // フィルタで有効かどうか
    };
  };
} 