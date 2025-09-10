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
import { Project, MemberProjectStatus } from '@/lib/types/project';
import { ProjectStatus } from '@/lib/types/enums';

const COLLECTION_NAME = 'projects';
const MEMBER_PROJECT_STATUS_COLLECTION = 'member_project_statuses';

/**
 * プロジェクトをFirestoreに保存
 */
export async function saveProject(project: Project, isServer = false): Promise<void> {
  try {
    const projectData = convertProjectToFirestoreData(project, isServer);
    
    if (isServer) {
      const adminDb = getAdminDb();
      await adminDb.collection(COLLECTION_NAME).doc(project.id).set(projectData);
    } else {
      await setDoc(doc(db, COLLECTION_NAME, project.id), projectData);
    }
  } catch (error) {
    console.error('プロジェクト保存エラー:', error);
    throw error;
  }
}

/**
 * 複数のプロジェクトを一括保存
 * 重複を防ぐため、既存データを上書きする形で保存
 */
export async function saveProjects(projects: Project[], isServer = false): Promise<void> {
  try {
    if (isServer) {
      const adminDb = getAdminDb();
      
      // バッチサイズ制限（Firestoreは500個まで）
      const batchSize = 500;
      
      for (let i = 0; i < projects.length; i += batchSize) {
        const batch = adminDb.batch();
        const batchProjects = projects.slice(i, i + batchSize);
        
        batchProjects.forEach(project => {
          const ref = adminDb.collection(COLLECTION_NAME).doc(project.id);
          // merge: trueで既存データを上書き更新
          batch.set(ref, convertProjectToFirestoreData(project, true), { merge: true });
        });
        
        await batch.commit();
        console.log(`プロジェクトバッチ ${Math.floor(i / batchSize) + 1} 保存完了: ${batchProjects.length}件`);
      }
    } else {
      await Promise.all(projects.map(project => saveProject(project, false)));
    }
  } catch (error) {
    console.error('プロジェクト一括保存エラー:', error);
    throw error;
  }
}

/**
 * プロジェクトIDでプロジェクトを取得
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, projectId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return convertFromFirestoreData(docSnap.data());
  } catch (error) {
    console.error('プロジェクト取得エラー:', error);
    throw error;
  }
}

/**
 * ステータスでプロジェクトを取得
 */
export async function getProjectsByStatus(status: ProjectStatus): Promise<Project[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', status),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertFromFirestoreData(doc.data()));
  } catch (error) {
    console.error('ステータス別プロジェクト取得エラー:', error);
    throw error;
  }
}

/**
 * 稼働中のプロジェクトを取得
 */
export async function getActiveProjects(): Promise<Project[]> {
  return getProjectsByStatus(ProjectStatus.ACTIVE);
}

/**
 * 職種でプロジェクトを検索
 */
export async function getProjectsByJobCategory(jobCategory: string): Promise<Project[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('jobCategory', '==', jobCategory),
      where('status', 'in', [ProjectStatus.RECRUITING, ProjectStatus.ACTIVE]),
      orderBy('hourlyRate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertFromFirestoreData(doc.data()));
  } catch (error) {
    console.error('職種別プロジェクト検索エラー:', error);
    throw error;
  }
}

/**
 * メンバー別案件状況を保存
 * 重複を防ぐため、既存データを上書きする形で保存
 */
export async function saveMemberProjectStatus(
  status: MemberProjectStatus, 
  isServer = false
): Promise<void> {
  try {
    const statusData = convertMemberProjectStatusToFirestore(status, isServer);
    
    if (isServer) {
      const adminDb = getAdminDb();
      // merge: trueで既存データを上書き更新
      await adminDb
        .collection(MEMBER_PROJECT_STATUS_COLLECTION)
        .doc(status.id)
        .set(statusData, { merge: true });
    } else {
      await setDoc(
        doc(db, MEMBER_PROJECT_STATUS_COLLECTION, status.id), 
        statusData
      );
    }
  } catch (error) {
    console.error('メンバー別案件状況保存エラー:', error);
    throw error;
  }
}

/**
 * メンバーIDで案件状況を取得
 */
export async function getMemberProjectStatusesByMemberId(
  memberId: string
): Promise<MemberProjectStatus[]> {
  try {
    const q = query(
      collection(db, MEMBER_PROJECT_STATUS_COLLECTION),
      where('memberId', '==', memberId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => 
      convertMemberProjectStatusFromFirestore(doc.data())
    );
  } catch (error) {
    console.error('メンバー案件状況取得エラー:', error);
    throw error;
  }
}

/**
 * プロジェクトIDで案件状況を取得
 */
export async function getMemberProjectStatusesByProjectId(
  projectId: string
): Promise<MemberProjectStatus[]> {
  try {
    const q = query(
      collection(db, MEMBER_PROJECT_STATUS_COLLECTION),
      where('projectId', '==', projectId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => 
      convertMemberProjectStatusFromFirestore(doc.data())
    );
  } catch (error) {
    console.error('プロジェクト別案件状況取得エラー:', error);
    throw error;
  }
}

// ========== ヘルパー関数 ==========

/**
 * ProjectをFirestore形式に変換
 */
function convertProjectToFirestoreData(project: Project, isServer = false): DocumentData {
  const TimestampClass = isServer ? AdminTimestamp : Timestamp;
  
  const data: any = {
    ...project,
    startDate: project.startDate ? TimestampClass.fromDate(project.startDate) : null,
    endDate: project.endDate ? TimestampClass.fromDate(project.endDate) : null,
    createdAt: TimestampClass.fromDate(project.createdAt),
    updatedAt: TimestampClass.fromDate(project.updatedAt),
    lastSyncedAt: project.lastSyncedAt ? TimestampClass.fromDate(project.lastSyncedAt) : null,
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
 * FirestoreデータをProjectに変換
 */
function convertFromFirestoreData(data: DocumentData): Project {
  return {
    ...data,
    startDate: data.startDate?.toDate(),
    endDate: data.endDate?.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    lastSyncedAt: data.lastSyncedAt?.toDate(),
  } as Project;
}

/**
 * MemberProjectStatusをFirestore形式に変換
 */
function convertMemberProjectStatusToFirestore(status: MemberProjectStatus, isServer = false): DocumentData {
  const TimestampClass = isServer ? AdminTimestamp : Timestamp;
  
  const data: any = {
    ...status,
    assignedDate: status.assignedDate ? TimestampClass.fromDate(status.assignedDate) : null,
    startDate: status.startDate ? TimestampClass.fromDate(status.startDate) : null,
    endDate: status.endDate ? TimestampClass.fromDate(status.endDate) : null,
    interviewDate: status.interviewDate ? TimestampClass.fromDate(status.interviewDate) : null,
    createdAt: TimestampClass.fromDate(status.createdAt),
    updatedAt: TimestampClass.fromDate(status.updatedAt),
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
 * FirestoreデータをMemberProjectStatusに変換
 */
function convertMemberProjectStatusFromFirestore(data: DocumentData): MemberProjectStatus {
  return {
    ...data,
    assignedDate: data.assignedDate?.toDate(),
    startDate: data.startDate?.toDate(),
    endDate: data.endDate?.toDate(),
    interviewDate: data.interviewDate?.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  } as MemberProjectStatus;
} 