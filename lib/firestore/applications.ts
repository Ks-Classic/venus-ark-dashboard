import { 
  Timestamp,
  WriteBatch,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { getAdminDb } from '../firebase/admin';
import logger, { isRecruitmentDebugEnabled, isRecruitmentVerboseEnabled } from '../logger';
import { Application, ApplicationInput } from '../types/application';
import { JobCategory } from '../types/enums';
import { normalizeName, normalizeEmail } from '../data-processing/normalization';
import { getWeekNumberFromDate, generateWeekKey } from '../date';

const COLLECTION_NAME = 'applications';

/**
 * FirestoreのQueryDocumentSnapshotをApplication型に変換するヘルパー関数
 */
function convertDocToApplication(doc: QueryDocumentSnapshot): Application {
  const data = doc.data();
  return {
    id: doc.id,
    ...(data as Omit<Application, 'id'>),
  } as Application;
}

/**
 * ApplicationInputからApplicationを作成する
 */
function createApplicationFromInput(
  input: ApplicationInput,
  sourceSheetId: string,
  sourceRowIndex: number
): Omit<Application, 'id'> {
  const now = Timestamp.now();
  const normalizedName = normalizeName(input.name);
  const normalizedEmail = normalizeEmail(input.email);
  
  let applicationWeek = '';
  if (input.applicationDate) {
    const date = input.applicationDate.toDate();
    const { year, month, weekInMonth } = getWeekNumberFromDate(date);
    applicationWeek = generateWeekKey(year, month, weekInMonth);
  }

  const toDateStr = (ts?: Timestamp | null) => ts ? ts.toDate().toISOString().split('T')[0] : undefined;

  const applicationData: Omit<Application, 'id'> = {
    sourceSheetId,
    sourceRowIndex,
    applicantName: input.name,
    normalizedName,
    email: normalizedEmail,
    jobCategory: input.jobCategory,
    mediaSource: input.source,
    applicationDate: input.applicationDate ? input.applicationDate.toDate().toISOString().split('T')[0] : '',
    applicationWeek,
    status: input.status,
    // ステージ日付を保存（YYYY-MM-DD）
    documentSubmitDate: toDateStr(input.documentSubmitDate),
    interviewDate: toDateStr(input.interviewDate),
    interviewImplementedDate: toDateStr(input.interviewImplementedDate),
    hireDate: toDateStr(input.hireDate),
    acceptanceDate: toDateStr(input.acceptanceDate),
    
    createdAt: now,
    updatedAt: now,
    syncedAt: now,
    phone: input.phone,
    rejectionReason: input.rejectionReason,
    rejectionDetail: input.rejectionDetails,
    formSubmissionTimestamp: input.formSubmissionTimestamp.toDate().toISOString(),
  } as any;

  return applicationData as any;
}

/**
 * 新しい応募データを追加する
 */
export async function addApplication(
  input: ApplicationInput,
  sourceSheetId: string,
  sourceRowIndex: number
): Promise<string> {
  try {
    const adminDbInstance = getAdminDb();
    const applicationData = createApplicationFromInput(input, sourceSheetId, sourceRowIndex);
    const docRef = await adminDbInstance.collection(COLLECTION_NAME).add(applicationData);
    if (isRecruitmentDebugEnabled()) {
      logger.debug({ id: docRef.id, sourceSheetId, sourceRowIndex, jobCategory: applicationData.jobCategory, applicationDate: applicationData.applicationDate }, '[APP] added application');
    }
    return docRef.id;
  } catch (error) {
    console.error('応募データの追加に失敗:', error);
    throw error;
  }
}

/**
 * 既存の応募データを更新する
 */
export async function updateApplication(
  id: string,
  input: ApplicationInput,
  sourceSheetId: string,
  sourceRowIndex: number
): Promise<void> {
  try {
    const adminDbInstance = getAdminDb();
    const applicationData = createApplicationFromInput(input, sourceSheetId, sourceRowIndex);
    const docRef = adminDbInstance.collection(COLLECTION_NAME).doc(id);
    await docRef.update({
      ...applicationData,
      updatedAt: Timestamp.now(),
      syncedAt: Timestamp.now(),
    });
    if (isRecruitmentDebugEnabled()) {
      logger.debug({ id, sourceSheetId, sourceRowIndex, jobCategory: applicationData.jobCategory }, '[APP] updated application');
    }
  } catch (error) {
    console.error('応募データの更新に失敗:', error);
    throw error;
  }
}

/**
 * 名寄せキー（正規化された氏名 + メールアドレス）で既存データを検索する
 */
export async function findApplicationByNameAndEmail(
  name: string,
  email: string,
  jobCategory?: JobCategory
): Promise<Application | null> {
  try {
    const adminDbInstance = getAdminDb();
    const normalizedName = normalizeName(name);
    const normalizedEmail = normalizeEmail(email);
    
    let q = adminDbInstance.collection(COLLECTION_NAME)
      .where('normalizedName', '==', normalizedName)
      .where('email', '==', normalizedEmail)
      .orderBy('createdAt', 'desc')
      .limit(1);
    
    if (jobCategory) {
      q = q.where('jobCategory', '==', jobCategory);
    }
    
    const querySnapshot = await q.get();
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return convertDocToApplication(querySnapshot.docs[0]);
    
  } catch (error) {
    console.error('名寄せ検索に失敗:', error);
    throw error;
  }
}

/**
 * 応募データをUpsert（存在すれば更新、なければ追加）する
 */
export async function upsertApplication(
  input: ApplicationInput,
  sourceSheetId: string,
  sourceRowIndex: number
): Promise<{ id: string; isNew: boolean }> {
  try {
    const existingApplication = await findApplicationByNameAndEmail(
      input.name,
      input.email,
      input.jobCategory
    );
    
    if (existingApplication) {
      await updateApplication(existingApplication.id, input, sourceSheetId, sourceRowIndex);
      return { id: existingApplication.id, isNew: false };
    } else {
      const id = await addApplication(input, sourceSheetId, sourceRowIndex);
      return { id, isNew: true };
    }
  } catch (error) {
    console.error('応募データのUpsertに失敗:', error);
    throw error;
  }
}

/**
 * 全ての応募データを取得する
 */
export async function getAllApplications(): Promise<Application[]> {
  try {
    const adminDbInstance = getAdminDb();
    const querySnapshot = await adminDbInstance.collection(COLLECTION_NAME).orderBy('applicationDate', 'desc').get();
    return querySnapshot.docs.map(convertDocToApplication);
  } catch (error) {
    console.error('全応募データの取得に失敗:', error);
    throw error;
  }
}

/**
 * 応募データをバッチでUpsertする
 */
export async function batchUpsertApplications(
  inputs: Array<{
    input: ApplicationInput;
    sourceSheetId: string;
    sourceRowIndex: number;
  }>
): Promise<{ processed: number; added: number; updated: number; errors: number }> {
  const adminDbInstance = getAdminDb();
  const batch = adminDbInstance.batch();
  let processedCount = 0;
  let addedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  const maskName = (name?: string | null) => {
    if (!name) return '';
    const head = name.slice(0, 1);
    return `${head}***`;
  };
  const maskEmail = (email?: string | null) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const head = (local || '').slice(0, 1);
    return `${head}***@${domain}`;
  };

  for (const { input, sourceSheetId, sourceRowIndex } of inputs) {
    try {
      const existingApplication = await findApplicationByNameAndEmail(input.name, input.email, input.jobCategory);
      const applicationData = createApplicationFromInput(input, sourceSheetId, sourceRowIndex);
      // undefined フィールドを Firestore に渡さない
      Object.keys(applicationData).forEach((k) => {
        const key = k as keyof typeof applicationData;
        if (applicationData[key] === undefined) {
          delete (applicationData as any)[key];
        }
      });

      if (existingApplication) {
        const docRef = adminDbInstance.collection(COLLECTION_NAME).doc(existingApplication.id);
        batch.update(docRef, {
          ...applicationData,
          updatedAt: Timestamp.now(),
          syncedAt: Timestamp.now(),
        });
        updatedCount++;
      } else {
        const docRef = adminDbInstance.collection(COLLECTION_NAME).doc();
        batch.set(docRef, applicationData);
        addedCount++;
      }
      processedCount++;
    } catch (batchError) {
      // PIIをぼかして行位置と職種を記録
      const obfuscated = { name: maskName(input.name), email: maskEmail(input.email), jobCategory: input.jobCategory };
      console.error(`[ERROR] バッチ処理中にエラー (row: ${sourceRowIndex} @ ${sourceSheetId})`, obfuscated, batchError instanceof Error ? batchError.message : batchError);
      errorCount++;
    }
  }

  try {
    await batch.commit();
  } catch (batchError) {
    console.error('[ERROR] Firestoreバッチコミットに失敗しました:', batchError);
    errorCount = processedCount - (addedCount + updatedCount);
  } 

  return { processed: processedCount, added: addedCount, updated: updatedCount, errors: errorCount };
}

/**
 * 指定された期間内の応募データを取得する
 */
export async function getApplicationsByDateRange(
  startDate: Date,
  endDate: Date,
  jobCategory?: JobCategory
): Promise<Application[]> {
  try {
    const adminDbInstance = getAdminDb();
    
    // 日付を文字列形式に変換（YYYY-MM-DD）
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`[DEBUG] 期間指定クエリ: ${startDateStr} 〜 ${endDateStr}, jobCategory: ${jobCategory || 'all'}`);
    
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDbInstance.collection(COLLECTION_NAME)
      .where('applicationDate', '>=', startDateStr)
      .where('applicationDate', '<=', endDateStr);

    if (jobCategory) {
      query = query.where('jobCategory', '==', jobCategory);
    }

    const querySnapshot = await query.get();
    const results = querySnapshot.docs.map(convertDocToApplication);
    
    console.log(`[DEBUG] 取得件数: ${results.length}件`);
    if (isRecruitmentDebugEnabled()) {
      const statusCounts: Record<string, number> = {};
      const missingDates: Record<string, number> = { applicationDate: 0, documentSubmitDate: 0, interviewDate: 0, interviewImplementedDate: 0, hireDate: 0, acceptanceDate: 0 };
      const stagePresence: Record<string, number> = { documentSubmitDate: 0, interviewDate: 0, interviewImplementedDate: 0, hireDate: 0, acceptanceDate: 0 };
      results.forEach(r => {
        statusCounts[(r as any).status] = (statusCounts[(r as any).status] || 0) + 1;
        ['documentSubmitDate','interviewDate','interviewImplementedDate','hireDate','acceptanceDate'].forEach(f => {
          if ((r as any)[f]) stagePresence[f] = (stagePresence[f] || 0) + 1;
          else missingDates[f]++;
        });
      });
      logger.debug({ statusCounts, stagePresence, missingDates }, '[APP] fetched applications stats (aggregated)');
      if (isRecruitmentVerboseEnabled()) {
        const limited = results.slice(0, 50).map(r => ({
          id: (r as any).id,
          jobCategory: (r as any).jobCategory,
          status: (r as any).status,
          applicationDate: (r as any).applicationDate,
          documentSubmitDate: (r as any).documentSubmitDate,
          interviewDate: (r as any).interviewDate,
          interviewImplementedDate: (r as any).interviewImplementedDate,
          hireDate: (r as any).hireDate,
          acceptanceDate: (r as any).acceptanceDate,
        }));
        logger.debug({ sampleSize: limited.length, sample: limited }, '[APP] sample applications (limited)');
      }
    }
    return results;
  } catch (error: any) {
    // インデックス未作成などのケースを明示
    if (error?.code === 9 || String(error?.message || '').includes('failed-precondition')) {
      logger.error({
        hint: 'Firestore index may be missing for applications by applicationDate range',
        suggestIndex: { collection: 'applications', fields: ['applicationDate ASC', ...(jobCategory ? ['jobCategory ASC'] : [])] }
      }, '[APP] Firestore index precondition failed');
    }
    console.error('期間指定での応募データ取得に失敗:', error);
    throw error;
  }
}

// 追加: 任意の日付フィールドで範囲カウント
export async function countByDateFieldRange(
  field: 'documentSubmitDate' | 'interviewDate' | 'interviewImplementedDate' | 'hireDate' | 'acceptanceDate',
  startDate: Date,
  endDate: Date,
  jobCategory?: JobCategory
): Promise<number> {
  const adminDbInstance = getAdminDb();
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDbInstance.collection(COLLECTION_NAME)
    .where(field, '>=', startStr)
    .where(field, '<=', endStr);
  if (jobCategory) q = q.where('jobCategory', '==', jobCategory);
  try {
    // 文字列型
    const snapStr = await q.get();
    // タイムスタンプ型（混在データ対策）
    let sizeTs = 0;
    try {
      const qTs: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDbInstance.collection(COLLECTION_NAME)
        .where(field, '>=', Timestamp.fromDate(startDate))
        .where(field, '<=', Timestamp.fromDate(endDate))
        .where('jobCategory', '==', jobCategory || (null as any));
      // jobCategory を where できない場合のため、分岐
    } catch {}
    let snapTs: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> | null = null;
    try {
      let q2: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDbInstance.collection(COLLECTION_NAME)
        .where(field, '>=', Timestamp.fromDate(startDate))
        .where(field, '<=', Timestamp.fromDate(endDate));
      if (jobCategory) q2 = q2.where('jobCategory', '==', jobCategory);
      snapTs = await q2.get();
      sizeTs = snapTs.size;
    } catch (e) {
      // タイムスタンプ型のインデックスが無いなどは警告に留める
      logger.warn({ field, hint: 'timestamp-typed variant query failed (optional)' }, '[APP] date field range (timestamp variant) failed');
    }

    const total = snapStr.size + sizeTs;
    console.log(`[DEBUG] countByDateFieldRange ${field}: string=${snapStr.size}, timestamp=${sizeTs}, total=${total}`);
    if (isRecruitmentDebugEnabled()) {
      const sampleStr = snapStr.docs.slice(0, 3).map(d => ({ id: d.id, jc: (d.data() as any).jobCategory, date: (d.data() as any)[field] }));
      const sampleTs = snapTs ? snapTs.docs.slice(0, 2).map(d => ({ id: d.id, jc: (d.data() as any).jobCategory, date: (d.data() as any)[field] })) : [];
      logger.debug({ field, sampleSize: sampleStr.length + sampleTs.length, sampleStr, sampleTs }, '[APP] sample docs for date field range (mixed types)');
    }
    if (isRecruitmentDebugEnabled() && total === 0) {
      logger.warn({ field, start: startStr, end: endStr, jobCategory: jobCategory || 'all' }, '[APP] zero count for date field range');
    }
    return total;
  } catch (error: any) {
    if (error?.code === 9 || String(error?.message || '').includes('failed-precondition')) {
      logger.error({
        hint: `Firestore index may be missing for applications by ${field} range`,
        suggestIndex: { collection: 'applications', fields: [`${field} ASC`, ...(jobCategory ? ['jobCategory ASC'] : [])] }
      }, '[APP] Firestore index precondition failed');
    }
    throw error;
  }
}

// 追加: updatedAt(Timestamp) でステータスを範囲カウント
export async function countByStatusUpdatedAtRange(
  status: string,
  startDate: Date,
  endDate: Date,
  jobCategory?: JobCategory
): Promise<number> {
  const adminDbInstance = getAdminDb();
  const startTs = Timestamp.fromDate(startDate);
  const endTs = Timestamp.fromDate(endDate);
  let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDbInstance.collection(COLLECTION_NAME)
    .where('status', '==', status)
    .where('updatedAt', '>=', startTs)
    .where('updatedAt', '<=', endTs);
  if (jobCategory) q = q.where('jobCategory', '==', jobCategory);
  try {
    const snap = await q.get();
    console.log(`[DEBUG] countByStatusUpdatedAtRange ${status}: ${snap.size}`);
    if (isRecruitmentDebugEnabled()) {
      const sample = snap.docs.slice(0, 5).map(d => ({ id: d.id, jc: (d.data() as any).jobCategory, updatedAt: (d.data() as any).updatedAt?.toDate?.()?.toISOString?.() || (d.data() as any).updatedAt }));
      logger.debug({ status, sampleSize: sample.length, sample }, '[APP] sample docs for status range');
    }
    return snap.size;
  } catch (error: any) {
    if (error?.code === 9 || String(error?.message || '').includes('failed-precondition')) {
      logger.error({
        hint: 'Firestore index may be missing for applications by status+updatedAt range',
        suggestIndex: { collection: 'applications', fields: ['status ASC', 'updatedAt ASC', ...(jobCategory ? ['jobCategory ASC'] : [])] }
      }, '[APP] Firestore index precondition failed');
    }
    throw error;
  }
}

// 追加: 不採用理由内訳を updatedAt 範囲で取得
export async function getRejectionBreakdownInRange(
  startDate: Date,
  endDate: Date,
  jobCategory?: JobCategory
): Promise<Record<string, number>> {
  const adminDbInstance = getAdminDb();
  const startTs = Timestamp.fromDate(startDate);
  const endTs = Timestamp.fromDate(endDate);
  let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDbInstance.collection(COLLECTION_NAME)
    .where('status', '==', '不採用')
    .where('updatedAt', '>=', startTs)
    .where('updatedAt', '<=', endTs);
  if (jobCategory) q = q.where('jobCategory', '==', jobCategory);
  const snap = await q.get();
  const map: Record<string, number> = {};
  snap.docs.forEach(d => {
    const r = (d.data() as any).rejectionReason || 'other';
    map[r] = (map[r] || 0) + 1;
  });
  console.log('[DEBUG] getRejectionBreakdownInRange', map);
  if (isRecruitmentDebugEnabled()) {
    const sample = snap.docs.slice(0, 5).map(d => ({ id: d.id, reason: (d.data() as any).rejectionReason }));
    logger.debug({ sampleSize: sample.length, sample, map }, '[APP] sample docs for rejection breakdown');
  }
  return map;
}

// 追加: formSubmissionTimestamp で範囲カウント（documentSubmitDateのフォールバック用）
export async function countByFormSubmissionTimestamp(
  startDate: Date,
  endDate: Date,
  jobCategory?: JobCategory
): Promise<number> {
  const adminDbInstance = getAdminDb();
  const startTs = Timestamp.fromDate(startDate);
  const endTs = Timestamp.fromDate(endDate);
  
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDbInstance.collection(COLLECTION_NAME)
    .where('formSubmissionTimestamp', '>=', startTs.toDate().toISOString())
    .where('formSubmissionTimestamp', '<=', endTs.toDate().toISOString());
    
  if (jobCategory) {
    query = query.where('jobCategory', '==', jobCategory);
  }
  
  try {
    const snapshot = await query.get();
    const count = snapshot.size;
    console.log(`[DEBUG] countByFormSubmissionTimestamp: ${count} (start: ${startTs.toDate().toISOString()}, end: ${endTs.toDate().toISOString()}, jobCategory: ${jobCategory || 'all'})`);
    
    if (isRecruitmentDebugEnabled()) {
      const sample = snapshot.docs.slice(0, 3).map(d => ({ 
        id: d.id, 
        jobCategory: (d.data() as any).jobCategory, 
        formSubmissionTimestamp: (d.data() as any).formSubmissionTimestamp 
      }));
      logger.debug({ 
        sampleSize: sample.length, 
        sample, 
        count 
      }, '[APP] sample docs for formSubmissionTimestamp range');
    }
    
    return count;
  } catch (error: any) {
    if (error?.code === 9 || String(error?.message || '').includes('failed-precondition')) {
      logger.error({
        hint: 'Firestore index may be missing for applications by formSubmissionTimestamp range',
        suggestIndex: { collection: 'applications', fields: ['formSubmissionTimestamp ASC', ...(jobCategory ? ['jobCategory ASC'] : [])] }
      }, '[APP] Firestore index precondition failed');
    }
    console.error('formSubmissionTimestamp での範囲カウントに失敗:', error);
    throw error;
  }
}