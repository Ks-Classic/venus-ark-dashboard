/**
 * 稼働履歴管理のFirestore操作
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch,
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase/client';
import { getAdminDb } from '@/lib/firebase/admin';
import { WorkHistory, WorkStatus } from '@/lib/types/member';

const COLLECTION_NAME = 'work_history';

/**
 * 稼働履歴を保存（サーバーサイド）
 */
export async function saveWorkHistory(workHistory: WorkHistory, isServer = false): Promise<void> {
  try {
    if (isServer) {
      const adminDb = getAdminDb();
      const docRef = adminDb.collection(COLLECTION_NAME).doc(workHistory.id);
      await docRef.set(convertToFirestoreData(workHistory, isServer));
    } else {
      const docRef = doc(db, COLLECTION_NAME, workHistory.id);
      await setDoc(docRef, convertToFirestoreData(workHistory, isServer));
    }
  } catch (error) {
    console.error('稼働履歴保存エラー:', error);
    throw error;
  }
}

/**
 * 複数の稼働履歴を一括保存（サーバーサイド）
 */
export async function saveWorkHistories(workHistories: WorkHistory[], isServer = false): Promise<void> {
  try {
    if (isServer) {
      const adminDb = getAdminDb();
      const batch = adminDb.batch();
      
      workHistories.forEach(workHistory => {
        const docRef = adminDb.collection(COLLECTION_NAME).doc(workHistory.id);
        batch.set(docRef, convertToFirestoreData(workHistory, isServer));
      });
      
      await batch.commit();
    } else {
      const batch = writeBatch(db);
      
      workHistories.forEach(workHistory => {
        const docRef = doc(db, COLLECTION_NAME, workHistory.id);
        batch.set(docRef, convertToFirestoreData(workHistory, isServer));
      });
      
      await batch.commit();
    }
  } catch (error) {
    console.error('稼働履歴一括保存エラー:', error);
    throw error;
  }
}

/**
 * メンバーIDで稼働履歴を取得
 */
export async function getWorkHistoryByMemberId(memberId: string): Promise<WorkHistory[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('memberId', '==', memberId),
      orderBy('startDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertFromFirestoreData(doc.data()));
  } catch (error) {
    console.error('メンバー稼働履歴取得エラー:', error);
    throw error;
  }
}

/**
 * 案件管理番号で稼働履歴を取得
 */
export async function getWorkHistoryByManagementNumber(managementNumber: string): Promise<WorkHistory[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('managementNumber', '==', managementNumber),
      orderBy('startDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertFromFirestoreData(doc.data()));
  } catch (error) {
    console.error('案件別稼働履歴取得エラー:', error);
    throw error;
  }
}

/**
 * 期間で稼働履歴を取得
 */
export async function getWorkHistoryByDateRange(
  startDate: Date, 
  endDate: Date
): Promise<WorkHistory[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('startDate', '>=', startDate),
      where('startDate', '<=', endDate),
      orderBy('startDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertFromFirestoreData(doc.data()));
  } catch (error) {
    console.error('期間別稼働履歴取得エラー:', error);
    throw error;
  }
}

/**
 * 全稼働履歴を取得（管理用）
 */
export async function getAllWorkHistory(limitCount?: number): Promise<WorkHistory[]> {
  try {
    let q = query(
      collection(db, COLLECTION_NAME),
      orderBy('startDate', 'desc')
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertFromFirestoreData(doc.data()));
  } catch (error) {
    console.error('全稼働履歴取得エラー:', error);
    throw error;
  }
}

/**
 * メンバーの初回稼働開始日を取得
 */
export async function getFirstWorkStartDate(memberId: string): Promise<Date | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('memberId', '==', memberId),
      orderBy('startDate', 'asc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    
    const firstRecord = convertFromFirestoreData(querySnapshot.docs[0].data());
    return firstRecord.startDate;
  } catch (error) {
    console.error('初回稼働開始日取得エラー:', error);
    return null;
  }
}

/**
 * 案件別稼働統計を取得
 */
export async function getProjectWorkStats(): Promise<any[]> {
  try {
    // TODO: Firestore Aggregation Queries を使用して実装
    // 現在は全データを取得して集計
    const allHistory = await getAllWorkHistory();
    
    const projectStats = new Map();
    
    allHistory.forEach(history => {
      const key = history.managementNumber || 'unknown';
      if (!projectStats.has(key)) {
        projectStats.set(key, {
          managementNumber: history.managementNumber,
          projectName: history.projectName,
          memberCount: new Set(),
          totalDuration: 0,
          avgHourlyRate: 0,
          rateSum: 0,
          rateCount: 0
        });
      }
      
      const stats = projectStats.get(key);
      stats.memberCount.add(history.memberId);
      
      if (history.hourlyRate) {
        stats.rateSum += history.hourlyRate;
        stats.rateCount++;
        stats.avgHourlyRate = stats.rateSum / stats.rateCount;
      }
      
      if (history.endDate) {
        const duration = history.endDate.getTime() - history.startDate.getTime();
        stats.totalDuration += duration;
      }
    });
    
    return Array.from(projectStats.values()).map(stats => ({
      ...stats,
      memberCount: stats.memberCount.size,
      avgDurationDays: Math.round(stats.totalDuration / (1000 * 60 * 60 * 24))
    }));
  } catch (error) {
    console.error('案件別稼働統計取得エラー:', error);
    throw error;
  }
}

// ========== ヘルパー関数 ==========

/**
 * WorkHistoryをFirestore形式に変換
 */
function convertToFirestoreData(workHistory: WorkHistory, isServer = false): DocumentData {
  const TimestampClass = isServer ? AdminTimestamp : Timestamp;
  
  const data: any = {
    ...workHistory,
    startDate: TimestampClass.fromDate(workHistory.startDate),
    endDate: workHistory.endDate ? TimestampClass.fromDate(workHistory.endDate) : null,
    createdAt: TimestampClass.fromDate(workHistory.createdAt),
    updatedAt: TimestampClass.fromDate(workHistory.updatedAt),
  };

  // undefined値を除去
  Object.keys(data).forEach(key => {
    if (data[key] === undefined) {
      delete data[key];
    }
  });

  return data;
}

/**
 * Firestoreデータをworkhistoryに変換
 */
function convertFromFirestoreData(data: DocumentData): WorkHistory {
  return {
    ...data,
    startDate: data.startDate.toDate(),
    endDate: data.endDate?.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  } as WorkHistory;
} 