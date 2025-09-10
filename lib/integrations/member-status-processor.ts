import { getAdminDb } from '@/lib/firebase/admin';
import { Member } from '@/lib/types/member';
import { MemberStatus } from '@/lib/types/enums';
import { format } from 'date-fns';

export interface StatusUpdateResult {
  success: boolean;
  updatedCount: number;
  errors: string[];
  updates: {
    memberId: string;
    name: string;
    oldStatus: MemberStatus;
    newStatus: MemberStatus;
    reason: string;
  }[];
}

/**
 * 契約終了日に基づいてメンバーステータスを自動更新
 */
export async function processContractEndedMembers(): Promise<StatusUpdateResult> {
  const result: StatusUpdateResult = {
    success: true,
    updatedCount: 0,
    errors: [],
    updates: []
  };

  try {
    const adminDb = getAdminDb();
    const membersSnapshot = await adminDb.collection('members').get();
    
    const members: Member[] = membersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        contractEndDate: data.contractEndDate?.toDate(),
        lastWorkEndDate: data.lastWorkEndDate?.toDate(),
        lastWorkStartDate: data.lastWorkStartDate?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Member;
    });

    console.log(`[STATUS_PROCESSOR] 処理対象メンバー総数: ${members.length}`);

    // 契約終了済みだがworkingステータスのメンバーを特定
    const contractEndedButWorking = members.filter(member => 
      member.status === 'working' && 
      member.contractEndDate && 
      member.contractEndDate <= new Date()
    );

    console.log(`[STATUS_PROCESSOR] 契約終了済みだがworkingステータス: ${contractEndedButWorking.length}名`);

    // バッチ処理で更新
    const batch = adminDb.batch();
    const now = new Date();

    for (const member of contractEndedButWorking) {
      try {
        const memberRef = adminDb.collection('members').doc(member.id);
        
        // 最新業務終了日を契約終了日に設定（未設定の場合）
                 const updateData: Partial<Member> = {
           status: MemberStatus.CONTRACT_ENDED,
           lastWorkEndDate: member.lastWorkEndDate || member.contractEndDate,
           updatedAt: now,
           statusUpdatedReason: `契約終了日(${format(member.contractEndDate!, 'yyyy-MM-dd')})による自動更新`
         };

        batch.update(memberRef, updateData);

                 result.updates.push({
           memberId: member.id,
           name: member.name,
           oldStatus: member.status,
           newStatus: MemberStatus.CONTRACT_ENDED,
           reason: `契約終了日: ${format(member.contractEndDate!, 'yyyy-MM-dd')}`
         });

        result.updatedCount++;

      } catch (error) {
        const errorMsg = `メンバー ${member.name} の更新に失敗: ${error}`;
        console.error(`[STATUS_PROCESSOR] ${errorMsg}`);
        result.errors.push(errorMsg);
        result.success = false;
      }
    }

    // バッチ実行
    if (result.updatedCount > 0) {
      await batch.commit();
      console.log(`[STATUS_PROCESSOR] ${result.updatedCount}名のステータスを更新しました`);
    } else {
      console.log(`[STATUS_PROCESSOR] 更新対象のメンバーはいませんでした`);
    }

  } catch (error) {
    const errorMsg = `ステータス処理中にエラーが発生: ${error}`;
    console.error(`[STATUS_PROCESSOR] ${errorMsg}`);
    result.errors.push(errorMsg);
    result.success = false;
  }

  return result;
}

/**
 * 稼働履歴の終了日に基づいて最新業務終了日を更新
 */
export async function processWorkHistoryEndDates(): Promise<StatusUpdateResult> {
  const result: StatusUpdateResult = {
    success: true,
    updatedCount: 0,
    errors: [],
    updates: []
  };

  try {
    const adminDb = getAdminDb();
    const membersSnapshot = await adminDb.collection('members').get();
    
    const members: Member[] = membersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        contractEndDate: data.contractEndDate?.toDate(),
        lastWorkEndDate: data.lastWorkEndDate?.toDate(),
        lastWorkStartDate: data.lastWorkStartDate?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        workHistory: data.workHistory?.map((h: any) => ({
          ...h,
          startDate: h.startDate?.toDate(),
          endDate: h.endDate?.toDate(),
        })) || []
      } as Member;
    });

    console.log(`[WORK_HISTORY_PROCESSOR] 処理対象メンバー総数: ${members.length}`);

    // 稼働履歴に終了日があるが、最新業務終了日が未設定のメンバー
    const needsEndDateUpdate = members.filter(member => 
      !member.lastWorkEndDate && 
      member.workHistory && 
      member.workHistory.some(h => h.endDate)
    );

    console.log(`[WORK_HISTORY_PROCESSOR] 最新業務終了日の更新が必要: ${needsEndDateUpdate.length}名`);

    const batch = adminDb.batch();
    const now = new Date();

    for (const member of needsEndDateUpdate) {
      try {
        // 稼働履歴から最新の終了日を取得
        const endedHistory = member.workHistory?.filter(h => h.endDate) || [];
        if (endedHistory.length === 0) continue;

        // 最新の終了日を取得（無効な日付を除外）
        const validEndDates = endedHistory
          .map(h => h.endDate)
          .filter(date => date && !isNaN(date.getTime())) as Date[];

        if (validEndDates.length === 0) continue;

        const latestEndDate = new Date(Math.max(...validEndDates.map(d => d.getTime())));
        
        const memberRef = adminDb.collection('members').doc(member.id);
        
        const updateData: Partial<Member> = {
          lastWorkEndDate: latestEndDate,
          updatedAt: now,
          statusUpdatedReason: `稼働履歴から最新業務終了日を自動設定: ${format(latestEndDate, 'yyyy-MM-dd')}`
        };

                 // 終了日が現在より前で、まだworkingステータスの場合は終了ステータスに変更
         if (latestEndDate <= now && member.status === 'working') {
           updateData.status = MemberStatus.WORK_ENDED;
         }

        batch.update(memberRef, updateData);

        result.updates.push({
          memberId: member.id,
          name: member.name,
          oldStatus: member.status,
          newStatus: updateData.status || member.status,
          reason: `稼働履歴から最新終了日設定: ${format(latestEndDate, 'yyyy-MM-dd')}`
        });

        result.updatedCount++;

      } catch (error) {
        const errorMsg = `メンバー ${member.name} の稼働履歴処理に失敗: ${error}`;
        console.error(`[WORK_HISTORY_PROCESSOR] ${errorMsg}`);
        result.errors.push(errorMsg);
        result.success = false;
      }
    }

    // バッチ実行
    if (result.updatedCount > 0) {
      await batch.commit();
      console.log(`[WORK_HISTORY_PROCESSOR] ${result.updatedCount}名の最新業務終了日を更新しました`);
    } else {
      console.log(`[WORK_HISTORY_PROCESSOR] 更新対象のメンバーはいませんでした`);
    }

  } catch (error) {
    const errorMsg = `稼働履歴処理中にエラーが発生: ${error}`;
    console.error(`[WORK_HISTORY_PROCESSOR] ${errorMsg}`);
    result.errors.push(errorMsg);
    result.success = false;
  }

  return result;
}

/**
 * 全てのステータス処理を実行
 */
export async function processAllMemberStatuses(): Promise<{
  contractEndedResult: StatusUpdateResult;
  workHistoryResult: StatusUpdateResult;
  totalUpdated: number;
}> {
  console.log('[MEMBER_STATUS_PROCESSOR] 全メンバーステータス処理を開始');
  
  // 1. 契約終了処理
  const contractEndedResult = await processContractEndedMembers();
  
  // 2. 稼働履歴処理
  const workHistoryResult = await processWorkHistoryEndDates();
  
  const totalUpdated = contractEndedResult.updatedCount + workHistoryResult.updatedCount;
  
  console.log('[MEMBER_STATUS_PROCESSOR] 全処理完了');
  console.log(`- 契約終了処理: ${contractEndedResult.updatedCount}名更新`);
  console.log(`- 稼働履歴処理: ${workHistoryResult.updatedCount}名更新`);
  console.log(`- 合計更新: ${totalUpdated}名`);
  
  return {
    contractEndedResult,
    workHistoryResult,
    totalUpdated
  };
} 