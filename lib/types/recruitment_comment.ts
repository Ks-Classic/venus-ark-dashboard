/**
 * Firestore永続保存用コメント型定義
 * 重要な分析結果や共有が必要なコメント用
 */
export interface RecruitmentComment {
  id: string;
  weekId: string;
  metricType: 'collection' | 'interview' | 'rejection';
  metricKey: string; // 'applyCount', 'interviewScheduled' など
  title: string;
  content: string;
  order: number;
  isPermanent: boolean; // 永続保存フラグ
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // 作成者ID（将来の多ユーザー対応）
}

/**
 * 統合コメントインターフェース
 * ローカルとFirestoreのコメントを統一的に扱うため
 */
export interface UnifiedComment {
  id: string;
  weekId: string;
  metricType: 'collection' | 'interview' | 'rejection';
  metricKey: string;
  title: string;
  content: string;
  order: number;
  isPermanent: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  source: 'local' | 'firestore';
}

/**
 * コメント作成用型
 */
export type RecruitmentCommentCreate = Omit<RecruitmentComment, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * コメント更新用型
 */
export type RecruitmentCommentUpdate = Partial<Pick<RecruitmentComment, 'title' | 'content' | 'order' | 'isPermanent'>>; 