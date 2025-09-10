// Venus Ark メンバー（稼働者）型定義

import { MemberStatus, WorkStatus, JobCategory } from './enums';

export interface Member {
  // 基本情報
  id: string; // FirestoreドキュメントID
  notionId?: string; // NotionデータベースのページID
  name: string; // 氏名
  normalizedName: string; // 正規化された氏名（名寄せ用）
  aliases: string[]; // 表記揺れの別名リスト
  email?: string;
  phone?: string;
  
  // 採用情報
  applicationDate?: Date; // 応募日
  hireDate?: Date; // 採用日
  firstCounselingDate?: Date; // 初回カウンセリング実施日
  
  // 個人属性
  nearestStation?: string; // 最寄り駅
  desiredShift?: string; // 希望シフト
  skills?: string[]; // スキル（動画編集、SNS運用等）
  learningPrograms?: string[]; // 受講した学習プログラム
  
  // 稼働状態
  status: MemberStatus;
  currentProject?: string; // 現在稼働中の案件ID
  firstWorkStartDate?: Date; // 初回稼働開始日（稼働履歴から算出）
  lastWorkStartDate?: Date; // 最新業務開始日
  lastWorkEndDate?: Date; // 最新業務終了日
  contractEndDate?: Date; // 業務委託契約終了日
  
  // 職種情報
  jobCategory: JobCategory;
  desiredJobCategories?: JobCategory[]; // 希望職種（複数可）
  
  // 稼働履歴
  workHistory?: WorkHistory[]; // 稼働履歴リスト
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date; // Notionとの最終同期日時
  statusUpdatedReason?: string; // ステータス更新理由
}

// 稼働履歴（メンバーDBのブロックコンテンツ内のテーブル）
export interface WorkHistory {
  id: string;
  memberId: string;
  memberName: string; // メンバー名（分析用）
  projectId: string;
  projectName: string;
  managementNumber?: string; // 案件管理番号（LIV-221など）
  startDate: Date;
  endDate?: Date;
  endReason?: string; // 終了理由
  status: WorkStatus;
  hourlyRate?: number; // 時給（案件の単価）
  monthlyHours?: number; // 月間稼働時間
  notes?: string;
}

// メンバー統計情報
export interface MemberStatistics {
  totalWorkDays: number; // 累計稼働日数
  totalProjects: number; // 累計案件数
  averageProjectDuration: number; // 平均案件継続期間（日）
  continuationRate1Month?: number; // 1ヶ月継続率
  continuationRate3Months?: number; // 3ヶ月継続率
  continuationRate6Months?: number; // 6ヶ月継続率
  continuationRate1Year?: number; // 1年継続率
} 