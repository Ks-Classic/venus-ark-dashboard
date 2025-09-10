import { getAdminDb } from '../../lib/firebase/admin';
import { SyncLog } from '../../lib/types/sync_log';

export async function addSyncLog(log: SyncLog): Promise<void> {
  const syncLogsCollection = getAdminDb().collection('sync_logs');
  try {
    await syncLogsCollection.add({
      ...log,
      timestamp: new Date(), // タイムスタンプはサーバー側で設定
    });
    console.log('Sync log added successfully.', log.status);
  } catch (error) {
    console.error('Error adding sync log:', error);
    throw error; // エラーを再スローして呼び出し元で処理できるようにする
  }
} 