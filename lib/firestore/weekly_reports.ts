import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '../firebase/admin';
import { WeeklyReport } from '../types/weekly_report';

const COLLECTION_NAME = 'weekly_reports';

function removeUndefinedDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj as any;
  if (Array.isArray(obj)) {
    return obj.map((v) => removeUndefinedDeep(v)) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [k, v] of Object.entries(obj as any)) {
      if (v === undefined) continue;
      cleaned[k] = removeUndefinedDeep(v as any);
    }
    return cleaned;
  }
  return obj;
}

/**
 * 週次レポートを保存または更新する
 */
export async function upsertWeeklyReport(report: WeeklyReport): Promise<void> {
  try {
    const adminDbInstance = getAdminDb();
    const docRef = adminDbInstance.collection(COLLECTION_NAME).doc(report.id);
    const cleaned = removeUndefinedDeep({
      ...report,
      updatedAt: Timestamp.now(),
    });
    await docRef.set(cleaned, { merge: true });
    
    console.log(`週次レポートを保存しました: ${report.id}`);
  } catch (error) {
    console.error('週次レポートの保存に失敗:', error);
    throw error;
  }
}

/**
 * 指定された週のレポートを取得する
 */
export async function getWeeklyReport(
  year: number,
  month: number,
  weekInMonth: number,
  jobCategory?: string
): Promise<WeeklyReport | null> {
  try {
    const adminDbInstance = getAdminDb();
    const reportId = jobCategory ? `${year}-${month}-${weekInMonth}-${jobCategory}` : `${year}-${month}-${weekInMonth}`;
    const docRef = adminDbInstance.collection(COLLECTION_NAME).doc(reportId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data() as WeeklyReport;
  } catch (error) {
    console.error('週次レポートの取得に失敗:', error);
    throw error;
  }
}

/**
 * 指定された期間のレポートを取得する
 */
export async function getWeeklyReportsByDateRange(
  startDate: Date,
  endDate: Date,
  jobCategory?: string
): Promise<WeeklyReport[]> {
  try {
    const adminDbInstance = getAdminDb();
    let query = adminDbInstance.collection(COLLECTION_NAME)
      .where('startDate', '>=', startDate.toISOString().split('T')[0])
      .where('endDate', '<=', endDate.toISOString().split('T')[0]);

    if (jobCategory) {
      query = query.where('jobCategory', '==', jobCategory);
    }

    const querySnapshot = await query.get();
    return querySnapshot.docs.map(doc => doc.data() as WeeklyReport);
  } catch (error) {
    console.error('期間指定での週次レポート取得に失敗:', error);
    throw error;
  }
}

/**
 * 全ての週次レポートを取得する
 */
export async function getAllWeeklyReports(): Promise<WeeklyReport[]> {
  try {
    const adminDbInstance = getAdminDb();
    const querySnapshot = await adminDbInstance.collection(COLLECTION_NAME)
      .orderBy('startDate', 'desc')
      .get();
    
    return querySnapshot.docs.map(doc => doc.data() as WeeklyReport);
  } catch (error) {
    console.error('全週次レポートの取得に失敗:', error);
    throw error;
  }
} 