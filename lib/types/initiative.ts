import { Timestamp } from 'firebase/firestore';

// 施策の状態
export enum InitiativeStatus {
  PLANNED = "計画中",
  IN_PROGRESS = "実施中", 
  COMPLETED = "実施完了",
  ON_HOLD = "保留",
  CANCELLED = "中止"
}

// 施策のカテゴリ
export enum InitiativeCategory {
  RECRUITMENT = "採用関連",
  STAFFING = "稼働者管理",
  SYSTEM_IMPROVEMENT = "システム改善",
  OPERATIONS = "業務改善",
  MARKETING = "マーケティング",
  OTHER = "その他"
}

// 優先度
export enum Priority {
  HIGH = "高",
  MEDIUM = "中",
  LOW = "低"
}

// 施策のメインデータ
export interface Initiative {
  id: string;
  title: string;
  category: InitiativeCategory;
  status: InitiativeStatus;
  priority: Priority;
  assignee?: string;
  dueDate?: Date;
  currentVersion: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 施策のバージョン履歴
export interface InitiativeVersion {
  id: string;
  initiativeId: string;
  version: number;
  issue: string;
  cause: string;
  action: string;
  result: string;
  status: InitiativeStatus;
  priority: Priority;
  assignee?: string;
  dueDate?: Date;
  changeReason?: string;
  createdAt: Timestamp;
  createdBy?: string;
}

// 施策の完全な詳細（メインデータ + 現在のバージョン）
export interface InitiativeDetail extends Initiative {
  currentVersionData?: InitiativeVersion;
}

// 施策の履歴付き詳細（メインデータ + 全バージョン履歴）
export interface InitiativeWithHistory extends Initiative {
  versions: InitiativeVersion[];
}

// 施策作成用のフォームデータ
export interface CreateInitiativeData {
  title: string;
  category: InitiativeCategory;
  status: InitiativeStatus;
  priority: Priority;
  assignee?: string;
  dueDate?: Date;
  issue: string;
  cause: string;
  action: string;
  result?: string;
  createdBy?: string;
}

// 施策更新用のフォームデータ
export interface UpdateInitiativeData {
  title?: string;
  category?: InitiativeCategory;
  status?: InitiativeStatus;
  priority?: Priority;
  assignee?: string;
  dueDate?: Date;
  issue?: string;
  cause?: string;
  action?: string;
  result?: string;
  changeReason?: string;
  updatedBy?: string;
}

// フィルタリング用のオプション
export interface InitiativeFilters {
  status?: InitiativeStatus[];
  category?: InitiativeCategory[];
  priority?: Priority[];
  assignee?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  searchQuery?: string;
}

// 施策の統計情報
export interface InitiativeStats {
  total: number;
  byStatus: Record<InitiativeStatus, number>;
  byCategory: Record<InitiativeCategory, number>;
  byPriority: Record<Priority, number>;
}

// バージョン差分表示用
export interface VersionDiff {
  field: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  changeType: 'added' | 'modified' | 'removed';
}

// バージョン比較結果
export interface VersionComparison {
  fromVersion: InitiativeVersion;
  toVersion: InitiativeVersion;
  differences: VersionDiff[];
} 