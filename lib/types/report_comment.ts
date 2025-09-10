import { Timestamp } from 'firebase/firestore';

export interface ReportComment {
  id?: string;
  reportId: string; // 対象となる週次レポートのID
  comment: string;
  authorId: string; // コメントしたユーザーのID
  authorName: string; // コメントしたユーザーの名前
  createdAt: Timestamp;
  updatedAt: Timestamp;
} 