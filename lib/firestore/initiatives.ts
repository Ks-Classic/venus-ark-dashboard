import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { 
  Initiative, 
  InitiativeVersion, 
  InitiativeDetail, 
  InitiativeWithHistory,
  CreateInitiativeData, 
  UpdateInitiativeData, 
  InitiativeFilters,
  InitiativeStats,
  InitiativeStatus,
  InitiativeCategory,
  Priority
} from '@/lib/types/initiative';

// Firestoreコレクション名
const INITIATIVES_COLLECTION = 'initiatives';
const INITIATIVE_VERSIONS_COLLECTION = 'initiative_versions';

/**
 * 施策一覧を取得（フィルタリング対応）
 */
export async function getInitiatives(filters?: InitiativeFilters): Promise<InitiativeDetail[]> {
  const db = getAdminDb();
  try {
    // インデックス要件を避けるため、ソートはサーバー側メモリで行う
    let query: FirebaseFirestore.Query = db.collection(INITIATIVES_COLLECTION);

    // フィルタリング条件を追加
    if (filters?.status && filters.status.length > 0) {
      query = query.where('status', 'in', filters.status);
    }
    if (filters?.category && filters.category.length > 0) {
      query = query.where('category', 'in', filters.category);
    }
    if (filters?.priority && filters.priority.length > 0) {
      query = query.where('priority', 'in', filters.priority);
    }
    if (filters?.assignee && filters.assignee.length > 0) {
      query = query.where('assignee', 'in', filters.assignee);
    }

    const querySnapshot = await query.get();
    
    const initiatives: InitiativeDetail[] = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const initiativeData = { 
        id: docSnapshot.id, 
        ...docSnapshot.data() 
      } as Initiative;
      
      // 現在のバージョンデータを取得
      const currentVersionData = await getCurrentVersionData(docSnapshot.id);
      
      initiatives.push({
        ...initiativeData,
        currentVersionData
      });
    }

    // updatedAt 降順にメモリ内ソート（Timestamp/Date/ISO文字列に対応）
    const toMillis = (v: any): number => {
      if (!v) return 0;
      if (v instanceof Date) return v.getTime();
      if (typeof (v as any)?.toDate === 'function') return (v as any).toDate().getTime();
      if (typeof v === 'string') return new Date(v).getTime() || 0;
      return 0;
    };
    initiatives.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));

    // 検索クエリでフィルタリング（クライアントサイド）
    if (filters?.searchQuery) {
      const searchQuery = filters.searchQuery.toLowerCase();
      return initiatives.filter(initiative => 
        initiative.title.toLowerCase().includes(searchQuery) ||
        (initiative.currentVersionData?.issue && initiative.currentVersionData.issue.toLowerCase().includes(searchQuery)) ||
        (initiative.currentVersionData?.cause && initiative.currentVersionData.cause.toLowerCase().includes(searchQuery)) ||
        (initiative.currentVersionData?.action && initiative.currentVersionData.action.toLowerCase().includes(searchQuery)) ||
        (initiative.assignee && initiative.assignee.toLowerCase().includes(searchQuery))
      );
    }

    return initiatives;
  } catch (error) {
    console.error('Error fetching initiatives:', error);
    throw error;
  }
}

/**
 * 特定の施策を取得
 */
export async function getInitiative(initiativeId: string): Promise<InitiativeDetail | null> {
  const db = getAdminDb();
  try {
    const docRef = db.collection(INITIATIVES_COLLECTION).doc(initiativeId);
    const docSnapshot = await docRef.get();
    
    if (!docSnapshot.exists) {
      return null;
    }
    
    const initiativeData = { 
      id: docSnapshot.id, 
      ...docSnapshot.data() 
    } as Initiative;
    
    const currentVersionData = await getCurrentVersionData(initiativeId);
    
    return {
      ...initiativeData,
      currentVersionData
    };
  } catch (error) {
    console.error('Error fetching initiative:', error);
    throw error;
  }
}

/**
 * 施策の履歴を取得
 */
export async function getInitiativeWithHistory(initiativeId: string): Promise<InitiativeWithHistory | null> {
  try {
    const initiative = await getInitiative(initiativeId);
    if (!initiative) return null;
    
    const versions = await getInitiativeVersions(initiativeId);
    
    return {
      ...initiative,
      versions
    };
  } catch (error) {
    console.error('Error fetching initiative with history:', error);
    throw error;
  }
}

/**
 * 施策のバージョン履歴を取得
 */
export async function getInitiativeVersions(initiativeId: string): Promise<InitiativeVersion[]> {
  const db = getAdminDb();
  try {
    const versionsRef = db.collection(INITIATIVE_VERSIONS_COLLECTION);
    const q = versionsRef.where('initiativeId', '==', initiativeId);
    const querySnapshot = await q.get();
    const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as InitiativeVersion[];
    items.sort((a, b) => (b.version || 0) - (a.version || 0));
    return items;
  } catch (error) {
    console.error('Error fetching initiative versions:', error);
    throw error;
  }
}

/**
 * 現在のバージョンデータを取得
 */
async function getCurrentVersionData(initiativeId: string): Promise<InitiativeVersion | undefined> {
  const db = getAdminDb();
  try {
    const versionsRef = db.collection(INITIATIVE_VERSIONS_COLLECTION);
    const q = versionsRef.where('initiativeId', '==', initiativeId);
    const querySnapshot = await q.get();
    if (querySnapshot.empty) return undefined;
    const versions = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as InitiativeVersion[];
    const latest = versions.reduce<InitiativeVersion | undefined>((acc, cur) => {
      if (!acc) return cur;
      return (cur.version || 0) > (acc.version || 0) ? cur : acc;
    }, undefined);
    return latest;
  } catch (error) {
    console.error('Error fetching current version data:', error);
    return undefined;
  }
}

/**
 * 新しい施策を作成
 */
export async function createInitiative(data: CreateInitiativeData): Promise<string> {
  const db = getAdminDb();
  try {
    const batch = db.batch();
    const now = Timestamp.now();
    
    // 施策メインデータを作成
    const initiativeRef = db.collection(INITIATIVES_COLLECTION).doc();
    const initiativeData: Omit<Initiative, 'id'> = {
      title: data.title,
      category: data.category,
      status: data.status,
      priority: data.priority,
      assignee: data.assignee || null,
      dueDate: data.dueDate ? Timestamp.fromDate(new Date(data.dueDate)) : null,
      currentVersion: 1,
      createdAt: now,
      updatedAt: now
    };
    
    batch.set(initiativeRef, initiativeData);
    
    // 初期バージョンを作成
    const versionRef = db.collection(INITIATIVE_VERSIONS_COLLECTION).doc();
    const versionData: Omit<InitiativeVersion, 'id'> = {
      initiativeId: initiativeRef.id,
      version: 1,
      issue: data.issue,
      cause: data.cause,
      action: data.action,
      result: data.result || '',
      status: data.status,
      priority: data.priority,
      assignee: data.assignee || null,
      dueDate: data.dueDate ? Timestamp.fromDate(new Date(data.dueDate)) : null,
      changeReason: '初回作成',
      createdAt: now,
      createdBy: data.createdBy || null
    };
    
    batch.set(versionRef, versionData);
    
    await batch.commit();
    return initiativeRef.id;
  } catch (error) {
    console.error('Error creating initiative:', error);
    throw error;
  }
}

/**
 * 施策を更新（新しいバージョンを作成）
 */
export async function updateInitiative(
  initiativeId: string, 
  data: UpdateInitiativeData
): Promise<void> {
  const db = getAdminDb();
  try {
    const batch = db.batch();
    const now = Timestamp.now();
    
    // 現在の施策データを取得
    const currentInitiative = await getInitiative(initiativeId);
    if (!currentInitiative) {
      throw new Error(`Initiative not found: ${initiativeId}`);
    }
    
    const newVersion = currentInitiative.currentVersion + 1;
    
    // 施策メインデータを更新
    const initiativeRef = db.collection(INITIATIVES_COLLECTION).doc(initiativeId);
    const initiativeUpdateData: any = {
      updatedAt: now,
      currentVersion: newVersion
    };
    
    // 基本情報の更新があれば反映
    if (data.title !== undefined) initiativeUpdateData.title = data.title;
    if (data.category !== undefined) initiativeUpdateData.category = data.category;
    if (data.status !== undefined) initiativeUpdateData.status = data.status;
    if (data.priority !== undefined) initiativeUpdateData.priority = data.priority;
    if (data.assignee !== undefined) initiativeUpdateData.assignee = data.assignee;
    if (data.dueDate !== undefined) initiativeUpdateData.dueDate = data.dueDate ? Timestamp.fromDate(new Date(data.dueDate)) : null;
    
    batch.update(initiativeRef, initiativeUpdateData);
    
    // 新しいバージョンを作成
    const versionRef = db.collection(INITIATIVE_VERSIONS_COLLECTION).doc();
    const versionData: Omit<InitiativeVersion, 'id'> = {
      initiativeId,
      version: newVersion,
      issue: data.issue ?? currentInitiative.currentVersionData?.issue ?? '',
      cause: data.cause ?? currentInitiative.currentVersionData?.cause ?? '',
      action: data.action ?? currentInitiative.currentVersionData?.action ?? '',
      result: data.result ?? currentInitiative.currentVersionData?.result ?? '',
      status: data.status ?? currentInitiative.status,
      priority: data.priority ?? currentInitiative.priority,
      assignee: (data.assignee !== undefined ? data.assignee : (currentInitiative.assignee ?? null)) as any,
      dueDate: data.dueDate ? Timestamp.fromDate(new Date(data.dueDate)) : ((currentInitiative.dueDate as any) ?? null),
      changeReason: data.changeReason || '更新',
      createdAt: now,
      createdBy: data.updatedBy || null
    };
    
    batch.set(versionRef, versionData);
    
    await batch.commit();
  } catch (error) {
    console.error('Error updating initiative:', error);
    throw error;
  }
}

/**
 * 施策を削除
 */
export async function deleteInitiative(initiativeId: string): Promise<void> {
  const db = getAdminDb();
  try {
    const batch = db.batch();
    
    // 施策メインデータを削除
    const initiativeRef = db.collection(INITIATIVES_COLLECTION).doc(initiativeId);
    batch.delete(initiativeRef);
    
    // 関連するバージョンをすべて削除
    const versions = await getInitiativeVersions(initiativeId);
    for (const version of versions) {
      const versionRef = db.collection(INITIATIVE_VERSIONS_COLLECTION).doc(version.id);
      batch.delete(versionRef);
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting initiative:', error);
    throw error;
  }
}

/**
 * 施策の統計情報を取得
 */
export async function getInitiativeStats(): Promise<InitiativeStats> {
  try {
    const initiatives = await getInitiatives();
    
    const stats: InitiativeStats = {
      total: initiatives.length,
      byStatus: {
        [InitiativeStatus.PLANNED]: 0,
        [InitiativeStatus.IN_PROGRESS]: 0,
        [InitiativeStatus.COMPLETED]: 0,
        [InitiativeStatus.ON_HOLD]: 0,
        [InitiativeStatus.CANCELLED]: 0
      },
      byCategory: {
        [InitiativeCategory.RECRUITMENT]: 0,
        [InitiativeCategory.STAFFING]: 0,
        [InitiativeCategory.SYSTEM_IMPROVEMENT]: 0,
        [InitiativeCategory.OPERATIONS]: 0,
        [InitiativeCategory.MARKETING]: 0,
        [InitiativeCategory.OTHER]: 0
      },
      byPriority: {
        [Priority.HIGH]: 0,
        [Priority.MEDIUM]: 0,
        [Priority.LOW]: 0
      }
    };
    
    initiatives.forEach(initiative => {
      if (stats.byStatus[initiative.status] !== undefined) {
        stats.byStatus[initiative.status]++;
      }
      if (stats.byCategory[initiative.category] !== undefined) {
        stats.byCategory[initiative.category]++;
      }
      if (stats.byPriority[initiative.priority] !== undefined) {
        stats.byPriority[initiative.priority]++;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error fetching initiative stats:', error);
    throw error;
  }
}