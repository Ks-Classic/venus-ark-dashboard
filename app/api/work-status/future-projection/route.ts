export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Member } from '@/lib/types/member';
import { MemberStatus } from '@/lib/types/enums';

interface MemberProjection {
  id: string;
  name: string;
  status: string;
  confidence?: 'high' | 'medium' | 'low';
  startDate?: string;
  endDate?: string;
  reason?: string;
}

interface FutureProjectionData {
  month: number;
  year: number;
  totalProjected: number;
  newStarting: {
    count: number;
    members: MemberProjection[];
  };
  switching: {
    count: number;
    members: MemberProjection[];
  };
  projectEnding: {
    count: number;
    members: MemberProjection[];
  };
  contractEnding: {
    count: number;
    members: MemberProjection[];
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2025');
    const month = parseInt(searchParams.get('month') || '6');

    console.log(`[DEBUG] Future projection API called for ${year}年${month}月`);
    console.log('[DEBUG] Firestore instance created.');

    // Admin SDKで全メンバーを取得
    const adminDb = getAdminDb();
    const membersSnapshot = await adminDb.collection('members').get();
    const members = membersSnapshot.docs.map(doc => convertFromFirestoreData({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`[DEBUG] 取得メンバー数: ${members.length}`);

    // ステータス分布を確認
    const statusCounts: Record<string, number> = {};
    const targetStatuses = [
      MemberStatus.JOB_MATCHING,
      MemberStatus.INTERVIEW_PREP,
      MemberStatus.INTERVIEW,
      MemberStatus.RESULT_WAITING,
      MemberStatus.HIRED
    ];
    
    members.forEach(member => {
      statusCounts[member.status] = (statusCounts[member.status] || 0) + 1;
    });
    
    console.log(`[DEBUG] ステータス分布:`, statusCounts);
    console.log(`[DEBUG] 対象ステータス (${targetStatuses.join(', ')}) のメンバー数:`, 
      members.filter(m => targetStatuses.includes(m.status as MemberStatus)).length);

    // 対象ステータスを持つメンバーの詳細を確認
    const membersWithTargetStatus = members.filter(m => targetStatuses.includes(m.status as MemberStatus));
    if (membersWithTargetStatus.length > 0) {
      console.log(`[DEBUG] 対象ステータスを持つメンバー詳細:`);
      membersWithTargetStatus.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.name} - ステータス: ${member.status}, lastWorkStartDate: ${member.lastWorkStartDate?.toISOString?.()}, lastWorkEndDate: ${member.lastWorkEndDate?.toISOString?.()}`);
      });
    }

    // 全メンバーのステータス一覧（重複除去）
    const statusSet = new Set(members.map(m => m.status));
    const uniqueStatuses = Array.from(statusSet);
    console.log(`[DEBUG] 全ステータス一覧:`, uniqueStatuses);

    // 日付フィールドの分布も確認
    const membersWithStartDate = members.filter(m => m.lastWorkStartDate);
    const membersWithEndDate = members.filter(m => m.lastWorkEndDate);
    const membersWithoutEndDate = members.filter(m => !m.lastWorkEndDate);
    
    console.log(`[DEBUG] lastWorkStartDate あり: ${membersWithStartDate.length}名`);
    console.log(`[DEBUG] lastWorkEndDate あり: ${membersWithEndDate.length}名`);
    console.log(`[DEBUG] lastWorkEndDate なし: ${membersWithoutEndDate.length}名`);

    // 重複除去のためのメンバー追跡
    const processedMembers = new Set<string>(); // 既に処理されたメンバーIDを追跡
    const memberMonthAssignments: Record<string, { month: number, year: number, category: string, priority: number }> = {};
    
    // 優先順位定義（数値が低いほど高優先）
    const PRIORITY = {
      DATE_BASED: 1,      // 具体的な日付指定
      STATUS_BASED: 2     // ステータス推定
    };

    // 3ヶ月分の予測データを生成
    const projections: FutureProjectionData[] = [];
    const currentDate = new Date();
    
    // 継続稼働者数 = 前月最終週の総稼働者数
    let baseActiveMembers = 0;
    
    // 前月の最終週を計算
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    
    // 前月の最終日を取得
    const lastDayOfPreviousMonth = new Date(previousYear, previousMonth, 0);
    
    // 前月最終週の総稼働者数を計算（isWorkingAtDate関数と同じロジック）
    for (const member of members) {
      const startDate = member.lastWorkStartDate;
      const endDate = member.lastWorkEndDate;
      const contractEndDate = member.contractEndDate;
      
      // 開始がない、または前月最終日より後は非稼働
      if (!startDate || startDate > lastDayOfPreviousMonth) continue;
      
      // 契約終了で締まっていれば非稼働
      if (contractEndDate && contractEndDate <= lastDayOfPreviousMonth) continue;
      
      // 終了が未設定なら稼働
      if (!endDate) {
        baseActiveMembers++;
        continue;
      }
      
      // 再稼働パターンは稼働
      if (endDate < startDate) {
        baseActiveMembers++;
        continue;
      }
      
      // 前月最終日以前に終了していれば非稼働
      if (endDate <= lastDayOfPreviousMonth) continue;
      
      // 前月最終日より後に終了 → 稼働
      baseActiveMembers++;
    }
    
    console.log(`[DEBUG] 継続稼働者数（${previousYear}年${previousMonth}月最終週総稼働者数）: ${baseActiveMembers}名`);
    
    // 累積稼働者数を追跡
    let cumulativeActiveMembers = baseActiveMembers;
    
    for (let i = 0; i < 3; i++) {
      const targetMonth = month + i;
      const targetYear = targetMonth > 12 ? year + 1 : year;
      const adjustedMonth = targetMonth > 12 ? targetMonth - 12 : targetMonth;
      
      const monthStart = new Date(targetYear, adjustedMonth - 1, 1);
      const monthEnd = new Date(targetYear, adjustedMonth, 0);
      
      // 当月かどうかを判定（実績+予定 vs 予定のみ）
      const isCurrentMonth = (targetYear === currentDate.getFullYear() && adjustedMonth === currentDate.getMonth() + 1);
      const isFutureMonth = monthStart > currentDate;

      console.log(`[DEBUG] ${targetYear}年${adjustedMonth}月の将来見込み算出中 (当月: ${isCurrentMonth}, 将来月: ${isFutureMonth})`);

      // 事前チェック: 該当月の条件に合うメンバーがいるかチェック
      const potentialNewStartingByDate = members.filter(m => 
        m.lastWorkStartDate && 
        m.lastWorkStartDate >= monthStart && 
        m.lastWorkStartDate <= monthEnd &&
        !m.lastWorkEndDate
      );
      
      const potentialNewStartingByStatus = members.filter(m => 
        targetStatuses.includes(m.status as MemberStatus) && !m.lastWorkStartDate
      );
      
      const potentialSwitchingByDate = members.filter(m => 
        m.lastWorkEndDate && 
        m.lastWorkStartDate &&
        m.lastWorkStartDate > m.lastWorkEndDate &&
        m.lastWorkStartDate >= monthStart && 
        m.lastWorkStartDate <= monthEnd
      );
      
      const potentialSwitchingByStatus = members.filter(m => 
        m.lastWorkEndDate && 
        targetStatuses.includes(m.status as MemberStatus)
      );
      
      console.log(`[DEBUG] ${targetYear}年${adjustedMonth}月 事前チェック結果:`);
      console.log(`  - 新規開始(日付条件): ${potentialNewStartingByDate.length}名`);
      console.log(`  - 新規開始(ステータス条件): ${potentialNewStartingByStatus.length}名`);
      console.log(`  - 切替完了(日付条件): ${potentialSwitchingByDate.length}名`);
      console.log(`  - 切替完了(ステータス条件): ${potentialSwitchingByStatus.length}名`);

      const newStartingMembers: MemberProjection[] = [];
      const switchingMembers: MemberProjection[] = [];
      const projectEndingMembers: MemberProjection[] = [];
      const contractEndingMembers: MemberProjection[] = [];

      // 重複除去のためのヘルパー関数
      const shouldAssignToCategory = (memberId: string, category: string, priority: number, targetMonth: number, targetYear: number): boolean => {
        const existingAssignment = memberMonthAssignments[memberId];
        
        if (!existingAssignment) {
          // 初回割り当て
          memberMonthAssignments[memberId] = { month: targetMonth, year: targetYear, category, priority };
          return true;
        }
        
        // 既存の割り当てより高優先度の場合、上書き
        if (priority < existingAssignment.priority) {
          console.log(`[DEBUG] ${memberId} の割り当てを更新: ${existingAssignment.category}(優先度${existingAssignment.priority}) → ${category}(優先度${priority})`);
          memberMonthAssignments[memberId] = { month: targetMonth, year: targetYear, category, priority };
          return true;
        }
        
        // 同じ優先度で異なる月の場合、より近い月（当月）を優先
        if (priority === existingAssignment.priority && targetMonth !== existingAssignment.month) {
          if (targetMonth === month) { // 当月を優先
            console.log(`[DEBUG] ${memberId} の割り当てを当月に変更: ${existingAssignment.month}月 → ${targetMonth}月`);
            memberMonthAssignments[memberId] = { month: targetMonth, year: targetYear, category, priority };
            return true;
          }
        }
        
        return false;
      };

      for (const member of members) {
        // 新規開始予定の計算（重複除去対応）
        const isNewStartingByDate = member.lastWorkStartDate && 
                                   member.lastWorkStartDate >= monthStart && 
                                   member.lastWorkStartDate <= monthEnd &&
                                   !member.lastWorkEndDate;
        
        const isNewStartingByStatus = [
          MemberStatus.JOB_MATCHING,
          MemberStatus.INTERVIEW_PREP,
          MemberStatus.INTERVIEW,
          MemberStatus.RESULT_WAITING,
          MemberStatus.HIRED
        ].includes(member.status as MemberStatus) && !member.lastWorkStartDate && !member.lastWorkEndDate;
        
        // 重複除去チェック
        let shouldAddToNewStarting = false;
        if (isNewStartingByDate) {
          shouldAddToNewStarting = shouldAssignToCategory(member.id, 'newStarting', PRIORITY.DATE_BASED, adjustedMonth, targetYear);
        } else if (isNewStartingByStatus) {
          shouldAddToNewStarting = shouldAssignToCategory(member.id, 'newStarting', PRIORITY.STATUS_BASED, adjustedMonth, targetYear);
        }
        
        if (shouldAddToNewStarting && (isNewStartingByDate || isNewStartingByStatus)) {
          console.log(`[DEBUG] 新規開始対象: ${member.name}, 条件1(日付): ${isNewStartingByDate}, 条件2(ステータス): ${isNewStartingByStatus}, 月: ${adjustedMonth}, lastWorkStartDate: ${member.lastWorkStartDate?.toISOString?.()}, status: ${member.status}`);
          const confidence = isCurrentMonth ? 'high' : 'medium';
          newStartingMembers.push({
            id: member.id,
            name: member.name,
            status: member.status,
            confidence,
            startDate: member.lastWorkStartDate?.toISOString().split('T')[0] || '未定'
          });
        }

        // 切替完了予定の計算（重複除去対応）
        const isSwitchingByDate = member.lastWorkEndDate && 
                                 member.lastWorkStartDate &&
                                 member.lastWorkStartDate > member.lastWorkEndDate &&
                                 member.lastWorkStartDate >= monthStart && 
                                 member.lastWorkStartDate <= monthEnd;
        
        const isSwitchingByStatus = member.lastWorkEndDate && 
                                   [
                                     MemberStatus.JOB_MATCHING,
                                     MemberStatus.INTERVIEW_PREP,
                                     MemberStatus.INTERVIEW,
                                     MemberStatus.RESULT_WAITING,
                                     MemberStatus.HIRED
                                   ].includes(member.status as MemberStatus);
        
        // 重複除去チェック
        let shouldAddToSwitching = false;
        if (isSwitchingByDate) {
          shouldAddToSwitching = shouldAssignToCategory(member.id, 'switching', PRIORITY.DATE_BASED, adjustedMonth, targetYear);
        } else if (isSwitchingByStatus) {
          shouldAddToSwitching = shouldAssignToCategory(member.id, 'switching', PRIORITY.STATUS_BASED, adjustedMonth, targetYear);
        }
        
        if (shouldAddToSwitching && (isSwitchingByDate || isSwitchingByStatus)) {
          console.log(`[DEBUG] 切替完了対象: ${member.name}, 条件1(日付): ${isSwitchingByDate}, 条件2(ステータス): ${isSwitchingByStatus}, 月: ${adjustedMonth}, lastWorkStartDate: ${member.lastWorkStartDate?.toISOString?.()}, lastWorkEndDate: ${member.lastWorkEndDate?.toISOString?.()}, status: ${member.status}`);
          const confidence = isCurrentMonth ? 'high' : 'medium';
          switchingMembers.push({
            id: member.id,
            name: member.name,
            status: member.status,
            confidence,
            startDate: member.lastWorkStartDate?.toISOString().split('T')[0] || '未定'
          });
        }

        // 案件終了予定の計算（重複除去対応）
        if (member.lastWorkEndDate && 
            member.lastWorkEndDate >= monthStart && 
            member.lastWorkEndDate <= monthEnd) {
          
          if (shouldAssignToCategory(member.id, 'projectEnding', PRIORITY.DATE_BASED, adjustedMonth, targetYear)) {
            const confidence = isCurrentMonth ? 'high' : 'medium';
            projectEndingMembers.push({
              id: member.id,
              name: member.name,
              status: member.status,
              confidence,
              endDate: member.lastWorkEndDate.toISOString().split('T')[0],
              reason: '案件終了'
            });
          }
        }

        // 契約終了予定の計算（重複除去対応）
        if (member.contractEndDate && 
            member.contractEndDate >= monthStart && 
            member.contractEndDate <= monthEnd) {
          
          if (shouldAssignToCategory(member.id, 'contractEnding', PRIORITY.DATE_BASED, adjustedMonth, targetYear)) {
            const confidence = 'high'; // 契約終了日は確定日付のため確度高
            contractEndingMembers.push({
              id: member.id,
              name: member.name,
              status: member.status,
              confidence,
              endDate: member.contractEndDate.toISOString().split('T')[0],
              reason: '契約終了'
            });
          }
        }
      }

      // 累積計算：前月の総数 + 今月の増減
      const monthlyChange = newStartingMembers.length + switchingMembers.length - projectEndingMembers.length - contractEndingMembers.length;
      const totalProjected = cumulativeActiveMembers + monthlyChange;

      console.log(`[DEBUG] ${targetYear}年${adjustedMonth}月: 前月継続=${cumulativeActiveMembers}, 新規=${newStartingMembers.length}, 切替=${switchingMembers.length}, 案件終了=${projectEndingMembers.length}, 契約終了=${contractEndingMembers.length}, 月次変化=${monthlyChange}, 見込総数=${totalProjected}`);
      
      // 重複除去の結果をログ出力
      const monthAssignments = Object.entries(memberMonthAssignments).filter(([_, assignment]) => 
        assignment.month === adjustedMonth && assignment.year === targetYear
      );
      console.log(`[DEBUG] ${targetYear}年${adjustedMonth}月の重複除去後割り当て:`, 
        monthAssignments.map(([memberId, assignment]) => `${memberId}:${assignment.category}(優先度${assignment.priority})`).join(', '));

      projections.push({
        month: adjustedMonth,
        year: targetYear,
        totalProjected: totalProjected,
        newStarting: {
          count: newStartingMembers.length,
          members: newStartingMembers
        },
        switching: {
          count: switchingMembers.length,
          members: switchingMembers
        },
        projectEnding: {
          count: projectEndingMembers.length,
          members: projectEndingMembers
        },
        contractEnding: {
          count: contractEndingMembers.length,
          members: contractEndingMembers
        }
      });
      
      // 次月の計算のために、今月の結果を累積稼働者数に反映
      cumulativeActiveMembers = totalProjected;
    }

    // 重複除去の全体統計をログ出力
    const totalAssignments = Object.keys(memberMonthAssignments).length;
    const categoryStats = Object.values(memberMonthAssignments).reduce((acc, assignment) => {
      acc[assignment.category] = (acc[assignment.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`[DEBUG] 重複除去完了: 総割り当てメンバー数=${totalAssignments}, カテゴリ別統計:`, categoryStats);

    return NextResponse.json({
      success: true,
      data: projections
    });

  } catch (error) {
    console.error('Future projection API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate future projection' },
      { status: 500 }
    );
  }
}

/**
 * Firestoreデータを Member 型に変換
 */
function convertFromFirestoreData(data: any): Member {
  return {
    id: data.id,
    notionId: data.notionId || data.id,
    name: data.name || '',
    normalizedName: data.normalizedName || '',
    aliases: data.aliases || [],
    email: data.email,
    phone: data.phone,
    applicationDate: data.applicationDate?.toDate ? data.applicationDate.toDate() : data.applicationDate,
    hireDate: data.hireDate?.toDate ? data.hireDate.toDate() : data.hireDate,
    firstCounselingDate: data.firstCounselingDate?.toDate ? data.firstCounselingDate.toDate() : data.firstCounselingDate,
    nearestStation: data.nearestStation,
    desiredShift: data.desiredShift,
    skills: data.skills || [],
    learningPrograms: data.learningPrograms || [],
    status: data.status || 'inactive',
    currentProject: data.currentProject,
    firstWorkStartDate: data.firstWorkStartDate?.toDate ? data.firstWorkStartDate.toDate() : data.firstWorkStartDate,
    lastWorkStartDate: data.lastWorkStartDate?.toDate ? data.lastWorkStartDate.toDate() : data.lastWorkStartDate,
    lastWorkEndDate: data.lastWorkEndDate?.toDate ? data.lastWorkEndDate.toDate() : data.lastWorkEndDate,
    contractEndDate: data.contractEndDate?.toDate ? data.contractEndDate.toDate() : data.contractEndDate,
    jobCategory: data.jobCategory,
    desiredJobCategories: data.desiredJobCategories || [],
    workHistory: (data.workHistory || []).map((history: any) => ({
      ...history,
      startDate: history.startDate?.toDate ? history.startDate.toDate() : history.startDate,
      endDate: history.endDate?.toDate ? history.endDate.toDate() : history.endDate
    })),
    statusUpdatedReason: data.statusUpdatedReason,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
    lastSyncedAt: data.lastSyncedAt?.toDate ? data.lastSyncedAt.toDate() : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { memberId, confidence } = await request.json();

    const db = getAdminDb();
    
    // 確度情報を更新
    await db.collection('members').doc(memberId).update({
      confidence,
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Confidence updated successfully'
    });

  } catch (error) {
    console.error('Update confidence API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update confidence' },
      { status: 500 }
    );
  }
} 