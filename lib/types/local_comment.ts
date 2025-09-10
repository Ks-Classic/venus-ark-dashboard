/**
 * ローカルストレージ用コメント型定義
 * 高速動作とコスト最適化のためのローカル保存用
 */
export interface LocalComment {
  id: string;
  weekId: string;
  metricType: 'collection' | 'interview' | 'rejection';
  metricKey: string; // 'applyCount', 'interviewScheduled' など
  title: string;
  content: string;
  order: number;
  createdAt: string; // ISO文字列
  updatedAt: string; // ISO文字列
}

/**
 * ローカルストレージのキー定数
 */
export const LOCAL_COMMENTS_KEY = 'recruitment_comments_local';

/**
 * ローカルコメントのユーティリティ型
 */
export type LocalCommentMetricType = LocalComment['metricType'];
export type LocalCommentCreate = Omit<LocalComment, 'id' | 'createdAt' | 'updatedAt'>;
export type LocalCommentUpdate = Partial<Pick<LocalComment, 'title' | 'content' | 'order'>>; 