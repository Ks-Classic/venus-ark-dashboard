// Venus Ark 稼働状況レポート型定義

import { JobCategory } from './enums';

// 週次稼働状況詳細（画像のような表形式データ）
export interface WeeklyWorkStatusDetail {
  year: number; // 2025
  month: number; // 4月
  weekDetails: WeeklyDetail[]; // 各週の詳細
}

// 週ごとの詳細データ
export interface WeeklyDetail {
  weekLabel: string; // "4月4W", "5月1W"など
  weekNumber: number; // 週番号
  totalWorkers: number; // 総稼働者数
  totalStarted: number; // 総開始人数
  newStarted: number; // 新規開始人数
  switching: number; // 切替完了人数
  totalEnded: number; // 総終了人数
  projectEnded: number; // 案件終了人数
  contractEnded: number; // 契約終了人数
  counselingStarted: number; // カウンセリング開始人数
  otherLeft: number; // その他離脱人数
  // 詳細リスト
  startedMembers: StartedMemberDetail[]; // 開始メンバー詳細
  endedMembers: EndedMemberDetail[]; // 終了メンバー詳細
  otherItems: OtherItemDetail[]; // その他人員推移項目
  // 説明用（累積の有効増減）
  effectiveStarted?: number; // 有効開始（前週非稼働→当週開始）
  effectiveEnded?: number; // 有効終了（前週稼働→当週終了）
  netChangeEffective?: number; // 有効純増減
}

// 開始メンバー詳細
export interface StartedMemberDetail {
  type: 'new' | 'switching'; // 新規開始 or 切替完了
  memberName: string;
  previousProject?: string; // 切替の場合の前案件
}

// 終了メンバー詳細
export interface EndedMemberDetail {
  type: 'project' | 'contract'; // 案件終了 or 契約終了
  memberName: string;
  reason?: string; // 終了理由
}

// その他ステータス詳細
export interface OtherItemDetail {
  type: 'counseling_start' | 'other_end'; // カウンセリング開始 or その他解脱
  count: number;
  members?: string[]; // 対象メンバー名
}

// 将来見込み稼働者データ
export interface FutureWorkersProjection {
  projectionDate: Date; // 見込み対象月
  totalProjected: number; // 総稼働者見込み数
  totalStarting: number; // 総開始人数
  newStarting: number; // 新規開始人数
  switchingCompleted: number; // 切替完了人数
  totalEndingProjected: number; // 総終了見込み人数
  projectEndingProjected: number; // 案件終了人数
  contractEndingProjected: number; // 契約終了人数
  details: FutureWorkerDetail[]; // 詳細リスト
}

// 将来見込み詳細
export interface FutureWorkerDetail {
  category: 'starting_new' | 'starting_switching' | 'ending_project' | 'ending_contract';
  memberName: string;
  projectName?: string;
  expectedDate?: Date;
  status: 'confirmed' | 'tentative'; // 確定 or 暫定
  notes?: string;
}

// 週次稼働状況レポート
export interface WeeklyWorkStatusReport {
  id: string; // {year}-{month}-W{weekInMonth} 形式 (例: 2025-06-W01)
  year: number;
  month: number;
  weekInMonth: number; // 月内週番号（1-5）
  dateRange: {
    start: Date;
    end: Date;
  };
  
  // 全体集計
  totalSummary: WorkStatusSummary;
  
  // 職種別集計
  summaryByCategory: Record<JobCategory, WorkStatusSummary>;
  
  // 継続率データ
  continuationRates: ContinuationRates;
  
  // 詳細リスト
  newWorkMembers: WorkStatusDetail[]; // 新規稼働メンバー
  switchingMembers: WorkStatusDetail[]; // 切り替えメンバー
  projectReleasedMembers: WorkStatusDetail[]; // 案件解除メンバー
  contractTerminatedMembers: WorkStatusDetail[]; // 契約解除メンバー
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
  generatedBy: 'system' | 'manual';
}

// 稼働状況サマリー
export interface WorkStatusSummary {
  // 人数集計
  newWorkCount: number; // 新規稼働数
  switchingCount: number; // 切り替え数
  projectReleaseCount: number; // 案件解除数
  contractTerminationCount: number; // 契約解除数
  
  // 稼働中メンバー数
  activeMembers: number; // 月初稼働人数
  currentActiveMembers: number; // 月末稼働人数
  netChange: number; // 純増減（新規+切り替え-案件解除-契約解除）
  
  // 率計算
  turnoverRate: number; // 離職率（%）
  growthRate: number; // 成長率（%）
}

// 継続率データ
export interface ContinuationRates {
  rate1Month: ContinuationRateDetail; // 1ヶ月継続率
  rate3Months: ContinuationRateDetail; // 3ヶ月継続率
  rate6Months: ContinuationRateDetail; // 6ヶ月継続率
  rate1Year: ContinuationRateDetail; // 1年継続率
}

// 継続率詳細
export interface ContinuationRateDetail {
  targetCount: number; // 対象者数（n期間前に開始した人数）
  continuedCount: number; // 継続者数
  rate: number; // 継続率（%）
  // 職種別内訳
  byCategory: Record<JobCategory, {
    targetCount: number;
    continuedCount: number;
    rate: number;
  }>;
}

// 稼働状況詳細（個別メンバー情報）
export interface WorkStatusDetail {
  memberId: string;
  memberName: string;
  jobCategory: JobCategory;
  projectId?: string;
  projectName?: string;
  statusChangeDate: Date; // 状態変更日
  previousProjectId?: string; // 前案件ID（切り替えの場合）
  previousProjectName?: string; // 前案件名
  reason?: string; // 理由（案件解除・契約解除の場合）
  nearestStation?: string; // 最寄り駅（分析用）
  workDuration?: number; // 稼働期間（日数）
  riskLevel?: 'low' | 'medium' | 'high'; // リスクレベル
}

// 月次稼働状況レポート
export interface MonthlyWorkStatusReport {
  id: string; // {year}-{month} 形式
  year: number;
  month: number;
  
  // 月次集計（週次レポートの集約）
  totalSummary: WorkStatusSummary;
  summaryByCategory: Record<JobCategory, WorkStatusSummary>;
  
  // 週別推移
  weeklyTrends: {
    weekInMonth: number; // 月内週番号（1-5）
    summary: WorkStatusSummary;
  }[];
  
  // 継続率トレンド
  continuationRateTrends: {
    current: ContinuationRates;
    previous: ContinuationRates; // 前月データ
    improvement: {
      rate1Month: number; // 改善率（ポイント）
      rate3Months: number;
      rate6Months: number;
      rate1Year: number;
    };
  };
  
  // 離脱要因分析
  attritionAnalysis: {
    byReason: Record<string, number>; // 理由別集計
    byDuration: {
      under1Month: number;
      under3Months: number;
      under6Months: number;
      over6Months: number;
    };
    byStation: Record<string, number>; // 最寄り駅別
  };
  
  // AI分析・考察
  aiInsights?: {
    summary: string;
    riskFactors: string[];
    recommendations: string[];
    predictedTrends: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// リアルタイム稼働状況（ダッシュボード表示用）
export interface WorkStatusDashboard {
  currentDate: Date;
  
  // 現在の稼働状況
  activeMembers: {
    total: number;
    byCategory: Record<JobCategory, number>;
    byProject: Array<{
      projectId: string;
      projectName: string;
      memberCount: number;
    }>;
  };
  
  // 今週の動き
  thisWeek: {
    newWork: number;
    switching: number;
    projectRelease: number;
    contractTermination: number;
  };
  
  // 今月の動き
  thisMonth: {
    newWork: number;
    switching: number;
    projectRelease: number;
    contractTermination: number;
  };
  
  // アラート
  alerts: Array<{
    type: 'high_risk' | 'low_continuation' | 'high_turnover';
    message: string;
    severity: 'info' | 'warning' | 'critical';
    affectedMembers?: string[];
  }>;
}

export interface MemberDetailWithDates {
  id: string;
  name: string;
  lastWorkStartDate?: string | null;
  lastWorkEndDate?: string | null;
  contractEndDate?: string | null;
  firstCounselingDate?: string | null;
  status?: string;
  projectName?: string;
  reason?: string;
}

// 最適化された週次詳細データ（メンバー詳細を含む）
export interface WeeklyDetailOptimized extends WeeklyDetail {
  memberDetails: {
    newStarted: MemberDetailWithDates[];
    switching: MemberDetailWithDates[];
    projectEnded: MemberDetailWithDates[];
    contractEnded: MemberDetailWithDates[];
    counselingStarted: MemberDetailWithDates[];
  };
}

// 最適化された週次稼働状況詳細
export interface WeeklyWorkStatusDetailOptimized {
  year: number;
  month: number;
  weekDetails: WeeklyDetailOptimized[];
} 