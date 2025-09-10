import { getAdminDb } from '@/lib/firebase/admin';
import { Member } from '@/lib/types/member';
import { MemberStatus } from '@/lib/types/enums';
import { format } from 'date-fns';

export interface NotionSyncResult {
  success: boolean;
  processedCount: number;
  updatedCount: number;
  errors: string[];
  updates: {
    memberId: string;
    name: string;
    fieldUpdates: string[];
  }[];
}

/**
 * 開始日なしメンバーの修正処理
 */
export async function fixMissingStartDates(): Promise<NotionSyncResult> {
  const result: NotionSyncResult = {
    success: true,
    processedCount: 0,
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
        lastWorkStartDate: data.lastWorkStartDate?.toDate(),
        lastWorkEndDate: data.lastWorkEndDate?.toDate(),
        firstWorkStartDate: data.firstWorkStartDate?.toDate(),
        contractEndDate: data.contractEndDate?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        workHistory: data.workHistory?.map((h: any) => ({
          ...h,
          startDate: h.startDate?.toDate(),
          endDate: h.endDate?.toDate(),
        })) || []
      } as Member;
    });

    console.log(`[NOTION_SYNC] 開始日なしメンバー修正処理開始`);
    
    // 開始日なしでworkingステータスのメンバーを特定
    const missingStartDateMembers = members.filter(member => 
      !member.lastWorkStartDate && 
      member.status === 'working' &&
      member.workHistory && 
      member.workHistory.length > 0
    );

    console.log(`[NOTION_SYNC] 開始日なしメンバー: ${missingStartDateMembers.length}名`);
    result.processedCount = missingStartDateMembers.length;

    const batch = adminDb.batch();
    const now = new Date();

    for (const member of missingStartDateMembers) {
      try {
        // 稼働履歴から最初の開始日を取得
        const validStartDates = member.workHistory
          ?.map(h => h.startDate)
          .filter(date => date && !isNaN(date.getTime())) as Date[];

        if (!validStartDates || validStartDates.length === 0) {
          console.log(`[NOTION_SYNC] ${member.name}: 有効な稼働履歴がありません`);
          continue;
        }

        // 最初の開始日を取得
        const firstStartDate = new Date(Math.min(...validStartDates.map(d => d.getTime())));
        
        // 最新の開始日を取得
        const lastStartDate = new Date(Math.max(...validStartDates.map(d => d.getTime())));
        
        const memberRef = adminDb.collection('members').doc(member.id);
        
        const updateData: Partial<Member> = {
          firstWorkStartDate: firstStartDate,
          lastWorkStartDate: lastStartDate,
          updatedAt: now,
          statusUpdatedReason: `稼働履歴から開始日を自動設定`
        };

        batch.update(memberRef, updateData);

        result.updates.push({
          memberId: member.id,
          name: member.name,
          fieldUpdates: [
            `初回開始日: ${format(firstStartDate, 'yyyy-MM-dd')}`,
            `最新開始日: ${format(lastStartDate, 'yyyy-MM-dd')}`
          ]
        });

        result.updatedCount++;

      } catch (error) {
        const errorMsg = `メンバー ${member.name} の開始日設定に失敗: ${error}`;
        console.error(`[NOTION_SYNC] ${errorMsg}`);
        result.errors.push(errorMsg);
        result.success = false;
      }
    }

    // バッチ実行
    if (result.updatedCount > 0) {
      await batch.commit();
      console.log(`[NOTION_SYNC] ${result.updatedCount}名の開始日を設定しました`);
    }

  } catch (error) {
    const errorMsg = `開始日修正処理中にエラーが発生: ${error}`;
    console.error(`[NOTION_SYNC] ${errorMsg}`);
    result.errors.push(errorMsg);
    result.success = false;
  }

  return result;
}

/**
 * 不採用メンバーのステータス修正処理
 */
export async function fixRejectedMembers(): Promise<NotionSyncResult> {
  const result: NotionSyncResult = {
    success: true,
    processedCount: 0,
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
        updatedAt: data.updatedAt?.toDate(),
      } as Member;
    });

    console.log(`[NOTION_SYNC] 不採用メンバー修正処理開始`);
    
    // 名前に「不採用」が含まれるメンバーを特定
    const rejectedMembers = members.filter(member => 
      member.name.includes('不採用') && 
      member.status === 'working'
    );

    console.log(`[NOTION_SYNC] 不採用メンバー: ${rejectedMembers.length}名`);
    result.processedCount = rejectedMembers.length;

    const batch = adminDb.batch();
    const now = new Date();

    for (const member of rejectedMembers) {
      try {
        const memberRef = adminDb.collection('members').doc(member.id);
        
        const updateData: Partial<Member> = {
          status: MemberStatus.INACTIVE,
          updatedAt: now,
          statusUpdatedReason: `名前に「不採用」が含まれるため自動でINACTIVEに変更`
        };

        batch.update(memberRef, updateData);

        result.updates.push({
          memberId: member.id,
          name: member.name,
          fieldUpdates: [`ステータス: working → inactive`]
        });

        result.updatedCount++;

      } catch (error) {
        const errorMsg = `メンバー ${member.name} のステータス更新に失敗: ${error}`;
        console.error(`[NOTION_SYNC] ${errorMsg}`);
        result.errors.push(errorMsg);
        result.success = false;
      }
    }

    // バッチ実行
    if (result.updatedCount > 0) {
      await batch.commit();
      console.log(`[NOTION_SYNC] ${result.updatedCount}名のステータスを更新しました`);
    }

  } catch (error) {
    const errorMsg = `不採用メンバー修正処理中にエラーが発生: ${error}`;
    console.error(`[NOTION_SYNC] ${errorMsg}`);
    result.errors.push(errorMsg);
    result.success = false;
  }

  return result;
}

/**
 * 全てのNotion同期改善処理を実行
 */
export async function runEnhancedNotionSync(): Promise<{
  startDateResult: NotionSyncResult;
  rejectedMembersResult: NotionSyncResult;
  totalUpdated: number;
}> {
  console.log('[ENHANCED_NOTION_SYNC] Notion同期改善処理を開始');
  
  // 1. 開始日なしメンバーの修正
  const startDateResult = await fixMissingStartDates();
  
  // 2. 不採用メンバーの修正
  const rejectedMembersResult = await fixRejectedMembers();
  
  const totalUpdated = startDateResult.updatedCount + rejectedMembersResult.updatedCount;
  
  console.log('[ENHANCED_NOTION_SYNC] 全処理完了');
  console.log(`- 開始日修正: ${startDateResult.updatedCount}名更新`);
  console.log(`- 不採用メンバー修正: ${rejectedMembersResult.updatedCount}名更新`);
  console.log(`- 合計更新: ${totalUpdated}名`);
  
  return {
    startDateResult,
    rejectedMembersResult,
    totalUpdated
  };
} 