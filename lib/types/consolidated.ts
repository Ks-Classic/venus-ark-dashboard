// Venus Ark Dashboard - 統合型定義
// 重複する型定義を統合し、一貫性を保つ

import { Timestamp } from 'firebase-admin/firestore';

// ==================== 共通型定義 ====================

/**
 * 基本的なエンティティの共通プロパティ
 */
export interface BaseEntity {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 同期可能なエンティティの共通プロパティ
 */
export interface SyncableEntity extends BaseEntity {
  syncedAt: Timestamp;
  sourceInfo: {
    sheetId?: string;
    sheetName?: string;
    rowIndex?: number;
    notionId?: string;
  };
}

/**
 * 週次データの共通プロパティ
 */
export interface WeeklyData {
  weekId: string;        // YYYY-MM-WW形式
  year: number;
  month: number;
  weekInMonth: number;
}

/**
 * 職種カテゴリ（統一版）
 */
export enum JobCategory {
  SNS_OPERATION = 'SNS運用',
  VIDEO_CREATOR = '動画クリエイター',
  AI_WRITER = 'AIライター',
  PHOTOGRAPHY_STAFF = '撮影スタッフ',
}

/**
 * 採用応募ステータス（統一版）
 */
export enum ApplicationStatus {
  APPLIED = 'applied',
  DOCUMENT_SUBMISSION = 'document_submission',
  INTERVIEW = 'interview',
  INTERVIEW_CONFIRMED = 'interview_confirmed',
  INTERVIEW_IMPLEMENTED = 'interview_implemented',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
  DECLINED = 'declined',
  WITHDRAWN = 'withdrawn'
}

/**
 * メンバーステータス（統一版）
 */
export enum MemberStatus {
  RECRUITING = 'recruiting',
  TRAINING = 'training',
  LEARNING_STARTED = 'learning_started',
  WORKING = 'working',
  PROJECT_RELEASED = 'project_released',
  CONTRACT_ENDED = 'contract_ended',
  WORK_ENDED = 'work_ended',
  INACTIVE = 'inactive',
  JOB_MATCHING = 'job_matching',
  INTERVIEW_PREP = 'interview_prep',
  INTERVIEW = 'interview',
  RESULT_WAITING = 'result_waiting',
  HIRED = 'hired'
}

/**
 * 不採用理由（統一版）
 */
export enum RejectionReason {
  EXPERIENCED = 'experienced',
  ELDERLY = 'elderly',
  UNSUITABLE = 'unsuitable',
  FOREIGN = 'foreign',
  RELOCATION_CHECK = 'relocation_check',
  POST_OFFER_WITHDRAWAL = 'post_offer_withdrawal',
  OTHER = 'other'
}

/**
 * 案件ステータス（統一版）
 */
export enum ProjectStatus {
  RECRUITING = 'recruiting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * イニシアチブステータス（統一版）
 */
export enum InitiativeStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled'
}

/**
 * 優先度レベル（統一版）
 */
export enum PriorityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * リスクレベル（統一版）
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// ==================== 型ガード関数 ====================

export function isJobCategory(value: string): value is JobCategory {
  return Object.values(JobCategory).includes(value as JobCategory);
}

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return Object.values(ApplicationStatus).includes(value as ApplicationStatus);
}

export function isMemberStatus(value: string): value is MemberStatus {
  return Object.values(MemberStatus).includes(value as MemberStatus);
}

export function isRejectionReason(value: string): value is RejectionReason {
  return Object.values(RejectionReason).includes(value as RejectionReason);
}

export function isProjectStatus(value: string): value is ProjectStatus {
  return Object.values(ProjectStatus).includes(value as ProjectStatus);
}

export function isInitiativeStatus(value: string): value is InitiativeStatus {
  return Object.values(InitiativeStatus).includes(value as InitiativeStatus);
}

export function isPriorityLevel(value: string): value is PriorityLevel {
  return Object.values(PriorityLevel).includes(value as PriorityLevel);
}

export function isRiskLevel(value: string): value is RiskLevel {
  return Object.values(RiskLevel).includes(value as RiskLevel);
}

// ==================== 共通インターフェース ====================

/**
 * フィルター状態の共通インターフェース
 */
export interface FilterState {
  jobCategory: JobCategory | 'all';
  status?: string | 'all';
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
}

/**
 * ページネーションの共通インターフェース
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * ソート状態の共通インターフェース
 */
export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * データ取得オプションの共通インターフェース
 */
export interface DataFetchOptions {
  filters?: FilterState;
  pagination?: PaginationState;
  sort?: SortState;
  includeDeleted?: boolean;
}

/**
 * APIレスポンスの共通インターフェース
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * エラー情報の共通インターフェース
 */
export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// ==================== 日付・時間関連 ====================

/**
 * 日付フォーマット定数
 */
export const DATE_FORMATS = {
  DISPLAY: 'YYYY/MM/DD',
  API: 'YYYY-MM-DD',
  TIMESTAMP: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  WEEK: 'YYYY-WW',
  MONTH: 'YYYY-MM'
} as const;

/**
 * 期間の型定義
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * 週次期間の型定義
 */
export interface WeekRange extends WeeklyData {
  startDate: Date;
  endDate: Date;
}

// ==================== エクスポート ====================

// すべての型定義をエクスポート
export * from './application';
export * from './member';
export * from './project';
export * from './initiative';
export * from './weekly_report';
export * from './work_status_report';
export * from './recruitment_dashboard';
export * from './recruitment_comment';
export * from './local_comment';
export * from './meeting_record';
export * from './optimized-weekly-summary';
export * from './weekly_summary';
export * from './report_comment';
export * from './sync_log';
