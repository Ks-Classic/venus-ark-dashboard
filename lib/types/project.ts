// Venus Ark 案件（Project）型定義

import { ProjectStatus, JobCategory, MemberProjectRelationStatus } from './enums';

export interface Project {
  // 基本情報
  id: string; // FirestoreドキュメントID
  notionId?: string; // NotionデータベースのページID
  managementNumber?: string; // 案件管理番号（LIV-221など）
  name: string; // 案件名
  clientName: string; // クライアント名（パートナー企業名）
  
  // 案件詳細
  description?: string; // 案件概要
  jobCategory: JobCategory; // 職種カテゴリ
  requiredSkills?: string[]; // 必要スキル
  
  // 勤務条件
  hourlyRate: number; // 時給（単価）
  workLocation?: string; // 勤務地
  workStyle: WorkStyle; // 勤務形態（リモート/出社/ハイブリッド）
  requiredHoursPerMonth?: number; // 月間必要稼働時間
  shiftPattern?: string; // シフトパターン
  
  // 案件状態
  status: ProjectStatus;
  maxCapacity?: number; // 最大受け入れ人数
  currentMembers: number; // 現在稼働中のメンバー数
  
  // 日付情報
  startDate?: Date; // 案件開始日
  endDate?: Date; // 案件終了予定日
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date; // Notionとの最終同期日時
}

// 勤務形態
export enum WorkStyle {
  REMOTE = 'remote', // リモート
  OFFICE = 'office', // 出社
  HYBRID = 'hybrid', // ハイブリッド
}

// メンバー別案件状況（Notion: メンバー別案件状況管理DB）
export interface MemberProjectStatus {
  id: string;
  memberId: string;
  memberName: string;
  projectId: string;
  projectName: string;
  status: MemberProjectRelationStatus;
  assignedDate?: Date; // アサイン日
  startDate?: Date; // 稼働開始日
  endDate?: Date; // 稼働終了日
  interviewDate?: Date; // 面接日
  interviewResult?: InterviewResult;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 面接結果
export enum InterviewResult {
  PASSED = 'passed', // 合格
  FAILED = 'failed', // 不合格
  PENDING = 'pending', // 保留
}

// 案件統計情報
export interface ProjectStatistics {
  totalMembers: number; // 累計稼働メンバー数
  averageDuration: number; // 平均稼働期間（日）
  turnoverRate: number; // 離職率
  monthlyRevenue: number; // 月間収益（時給×稼働時間×人数）
} 