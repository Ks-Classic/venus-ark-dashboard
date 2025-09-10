export interface SyncLog {
  id?: string; // FirestoreドキュメントID
  timestamp: Date;
  status: 'success' | 'failure';
  processedCount: number;
  addedCount: number;
  updatedCount: number;
  error?: string;
  errorMessage?: string;
  details?: Record<string, any>; // その他の詳細情報
} 