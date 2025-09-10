import { db } from '@/lib/firebase/client';
import { getAdminDb } from '@/lib/firebase/admin';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { Member, WorkHistory } from '@/lib/types/member';
import { MemberStatus } from '@/lib/types/enums';

const COLLECTION_NAME = 'members';

/**
 * メンバーをFirestoreに保存
 */
export async function saveMember(member: Member, isServer = false): Promise<void> {
  try {
    const memberData = convertToFirestoreData(member, isServer);
    
    if (isServer) {
      const adminDb = getAdminDb();
      await adminDb.collection(COLLECTION_NAME).doc(member.id).set(memberData);
    } else {
      await setDoc(doc(db, COLLECTION_NAME, member.id), memberData);
    }
  } catch (error) {
    console.error('メンバー保存エラー:', error);
    throw error;
  }
}

/**
 * 複数のメンバーを一括保存（バッチ処理）
 * 重複を防ぐため、既存データを上書きする形で保存
 */
export async function saveMembers(members: Member[], isServer = false): Promise<void> {
  try {
    if (isServer) {
      const adminDb = getAdminDb();
      
      // バッチサイズ制限（Firestoreは500個まで）
      const batchSize = 500;
      
      for (let i = 0; i < members.length; i += batchSize) {
        const batch = adminDb.batch();
        const batchMembers = members.slice(i, i + batchSize);
        
        batchMembers.forEach(member => {
          const ref = adminDb.collection(COLLECTION_NAME).doc(member.id);
          // merge: trueで既存データを上書き更新
          batch.set(ref, convertToFirestoreData(member, true), { merge: true });
        });
        
        await batch.commit();
        console.log(`メンバーバッチ ${Math.floor(i / batchSize) + 1} 保存完了: ${batchMembers.length}件`);
      }
    } else {
      // クライアント側では個別に保存
      await Promise.all(members.map(member => saveMember(member, false)));
    }
  } catch (error) {
    console.error('メンバー一括保存エラー:', error);
    throw error;
  }
}

/**
 * メンバーIDでメンバーを取得
 */
export async function getMemberById(memberId: string): Promise<Member | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, memberId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return convertFromFirestoreData(docSnap.data());
  } catch (error) {
    console.error('メンバー取得エラー:', error);
    throw error;
  }
}

/**
 * 名前（正規化された名前）でメンバーを検索
 */
export async function getMemberByName(name: string): Promise<Member | null> {
  try {
    const normalizedName = normalizeName(name);
    const q = query(
      collection(db, COLLECTION_NAME),
      where('normalizedName', '==', normalizedName),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    
    return convertFromFirestoreData(querySnapshot.docs[0].data());
  } catch (error) {
    console.error('メンバー名検索エラー:', error);
    throw error;
  }
}

/**
 * メールアドレスでメンバーを検索
 */
export async function getMemberByEmail(email: string): Promise<Member | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('email', '==', email),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    
    return convertFromFirestoreData(querySnapshot.docs[0].data());
  } catch (error) {
    console.error('メール検索エラー:', error);
    throw error;
  }
}

/**
 * ステータスでメンバーを取得
 */
export async function getMembersByStatus(status: MemberStatus): Promise<Member[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', status),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertFromFirestoreData(doc.data()));
  } catch (error) {
    console.error('ステータス別メンバー取得エラー:', error);
    throw error;
  }
}

/**
 * 稼働中のメンバーを取得（稼働 + 学習開始）
 * 総稼働者数の定義: Notionメンバーデータベースのステータスが「稼働」か「学習開始」の総数
 */
export async function getActiveMembers(): Promise<Member[]> {
  try {
    const workingMembers = await getMembersByStatus(MemberStatus.WORKING);
    const learningStartedMembers = await getMembersByStatus(MemberStatus.LEARNING_STARTED);
    return [...workingMembers, ...learningStartedMembers];
  } catch (error) {
    console.error('稼働中メンバー取得エラー:', error);
    throw error;
  }
}

/**
 * 全メンバーを取得
 */
export async function getAllMembers(): Promise<Member[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertFromFirestoreData({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('全メンバー取得エラー:', error);
    throw error;
  }
}

/**
 * メンバーの稼働履歴を更新
 */
export async function updateMemberWorkHistory(
  memberId: string, 
  workHistory: WorkHistory[]
): Promise<void> {
  try {
    // 稼働履歴は別コレクションで管理
    const adminDb = getAdminDb();
    const batch = adminDb.batch();
    
    workHistory.forEach(history => {
      const ref = adminDb
        .collection(COLLECTION_NAME)
        .doc(memberId)
        .collection('workHistory')
        .doc(history.id);
      batch.set(ref, convertWorkHistoryToFirestore(history));
    });
    
    await batch.commit();
  } catch (error) {
    console.error('稼働履歴更新エラー:', error);
    throw error;
  }
}

/**
 * 名寄せ処理：同一人物と思われるメンバーを統合
 */
export async function mergeMembers(
  primaryMemberId: string,
  duplicateMemberIds: string[]
): Promise<void> {
  try {
    const primaryMember = await getMemberById(primaryMemberId);
    if (!primaryMember) {
      throw new Error('プライマリメンバーが見つかりません');
    }
    
    // 重複メンバーの別名を収集
    const aliases = new Set(primaryMember.aliases);
    for (const duplicateId of duplicateMemberIds) {
      const duplicateMember = await getMemberById(duplicateId);
      if (duplicateMember) {
        aliases.add(duplicateMember.name);
        aliases.add(duplicateMember.normalizedName);
        duplicateMember.aliases.forEach(alias => aliases.add(alias));
      }
    }
    
    // プライマリメンバーの別名を更新
    primaryMember.aliases = Array.from(aliases);
    await saveMember(primaryMember);
    
    // TODO: 重複メンバーのデータをプライマリメンバーに統合
    // TODO: 重複メンバーを非アクティブ化または削除
  } catch (error) {
    console.error('メンバー統合エラー:', error);
    throw error;
  }
}

// ========== ヘルパー関数 ==========

/**
 * 名前の正規化
 */
function normalizeName(name: string): string {
  // 全角・半角スペースを除去
  let normalized = name.replace(/[\s　]+/g, '');
  
  // ふりがな（括弧内）を除去
  normalized = normalized.replace(/[（(][^）)]*[）)]/g, '');
  
  return normalized;
}

/**
 * Memberデータをサーバーサイド用のFirestore形式に変換
 */
function convertToFirestoreData(member: Member, isServer = false): DocumentData {
  const TimestampClass = isServer ? AdminTimestamp : Timestamp;
  
  const data: any = {
    ...member,
    applicationDate: member.applicationDate ? TimestampClass.fromDate(member.applicationDate) : null,
    hireDate: member.hireDate ? TimestampClass.fromDate(member.hireDate) : null,
    firstWorkStartDate: member.firstWorkStartDate ? TimestampClass.fromDate(member.firstWorkStartDate) : null,
    lastWorkStartDate: member.lastWorkStartDate ? TimestampClass.fromDate(member.lastWorkStartDate) : null,
    firstCounselingDate: member.firstCounselingDate ? TimestampClass.fromDate(member.firstCounselingDate) : null,
    lastWorkEndDate: member.lastWorkEndDate ? TimestampClass.fromDate(member.lastWorkEndDate) : null,
    contractEndDate: member.contractEndDate ? TimestampClass.fromDate(member.contractEndDate) : null,
    createdAt: TimestampClass.fromDate(member.createdAt),
    updatedAt: TimestampClass.fromDate(member.updatedAt),
    lastSyncedAt: member.lastSyncedAt ? TimestampClass.fromDate(member.lastSyncedAt) : TimestampClass.fromDate(new Date()),
    // 稼働履歴も変換
    workHistory: member.workHistory?.map(history => ({
      ...history,
      startDate: TimestampClass.fromDate(history.startDate),
      endDate: history.endDate ? TimestampClass.fromDate(history.endDate) : null,
      // undefined値を除去
      managementNumber: history.managementNumber || null,
      projectId: history.projectId || null,
      endReason: history.endReason || null,
      hourlyRate: history.hourlyRate || null,
      monthlyHours: history.monthlyHours || null,
      notes: history.notes || null,
    })) || [],
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
 * Firestoreデータをmemberに変換
 */
function convertFromFirestoreData(data: DocumentData): Member {
  return {
    ...data,
    applicationDate: data.applicationDate?.toDate(),
    hireDate: data.hireDate?.toDate(),
    firstWorkStartDate: data.firstWorkStartDate?.toDate(),
    firstCounselingDate: data.firstCounselingDate?.toDate(),
    lastWorkEndDate: data.lastWorkEndDate?.toDate(),
    contractEndDate: data.contractEndDate?.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    lastSyncedAt: data.lastSyncedAt?.toDate(),
  } as Member;
}

/**
 * WorkHistoryをFirestore形式に変換
 */
function convertWorkHistoryToFirestore(history: WorkHistory, isServer = true): DocumentData {
  const TimestampClass = isServer ? AdminTimestamp : Timestamp;
  
  return {
    ...history,
    startDate: TimestampClass.fromDate(history.startDate),
    endDate: history.endDate ? TimestampClass.fromDate(history.endDate) : null,
  };
} 