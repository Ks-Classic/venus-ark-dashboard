import { getAdminDb } from '@/lib/firebase/admin';
import { Member, WorkHistory } from '@/lib/types/member';
import { MemberStatus, JobCategory, WorkStatus } from '@/lib/types/enums';
import { 
  WeeklyWorkStatusReport, 
  WorkStatusSummary, 
  ContinuationRates, 
  ContinuationRateDetail,
  WorkStatusDetail 
} from '@/lib/types/work_status_report';
import { getWeekDateRange, getWeekIdentifier } from '@/lib/date';

/**
 * 指定週の稼働状況レポートを生成
 */
export async function generateWeeklyWorkStatusReport(
  year: number,
  month: number,
  weekInMonth: number
): Promise<WeeklyWorkStatusReport> {
  const { start, end } = getWeekDateRange(year, month, weekInMonth);
  const weekId = getWeekIdentifier(year, month, weekInMonth);
  
  // メンバーと稼働履歴データを取得
  const members = await fetchMembersWithWorkHistory();
  
  // 週次の稼働状況を集計
  const weeklyStatus = analyzeWeeklyWorkStatus(members, start, end);
  
  // 継続率を計算
  const continuationRates = await calculateContinuationRates(members, end);
  
  // 職種別集計
  const summaryByCategory: Record<JobCategory, WorkStatusSummary> = {
    [JobCategory.SNS_OPERATION]: createEmptySummary(),
    [JobCategory.VIDEO_CREATOR]: createEmptySummary(),
    [JobCategory.AI_WRITER]: createEmptySummary(),
    [JobCategory.PHOTOGRAPHY_STAFF]: createEmptySummary(),
  };
  
  // 職種別に集計
  for (const category of Object.values(JobCategory)) {
    const categoryMembers = members.filter(m => m.jobCategory === category);
    const categoryStatus = analyzeWeeklyWorkStatus(categoryMembers, start, end);
    summaryByCategory[category] = categoryStatus.totalSummary;
  }
  
  return {
    id: weekId,
    year,
    month,
    weekInMonth,
    dateRange: { start, end },
    totalSummary: weeklyStatus.totalSummary,
    summaryByCategory,
    continuationRates,
    newWorkMembers: weeklyStatus.newWorkMembers,
    switchingMembers: weeklyStatus.switchingMembers,
    projectReleasedMembers: weeklyStatus.projectReleasedMembers,
    contractTerminatedMembers: weeklyStatus.contractTerminatedMembers,
    createdAt: new Date(),
    updatedAt: new Date(),
    generatedBy: 'system',
  };
}

/**
 * メンバーと稼働履歴を取得
 */
async function fetchMembersWithWorkHistory(): Promise<(Member & { workHistory: WorkHistory[] })[]> {
  const adminDb = getAdminDb();
  
  // メンバーデータを取得
  const membersSnapshot = await adminDb.collection('members').get();
  const membersWithHistory: (Member & { workHistory: WorkHistory[] })[] = [];
  
  for (const doc of membersSnapshot.docs) {
    const memberData = doc.data();
    
    // 稼働履歴を取得
    const workHistorySnapshot = await adminDb
      .collection('members')
      .doc(doc.id)
      .collection('workHistory')
      .orderBy('startDate', 'desc')
      .get();
    
    const workHistory: WorkHistory[] = workHistorySnapshot.docs.map(histDoc => ({
      ...histDoc.data(),
      id: histDoc.id,
      startDate: histDoc.data().startDate?.toDate(),
      endDate: histDoc.data().endDate?.toDate(),
    } as WorkHistory));
    
    membersWithHistory.push({
      ...memberData,
      id: doc.id,
      createdAt: memberData.createdAt?.toDate() || new Date(),
      updatedAt: memberData.updatedAt?.toDate() || new Date(),
      applicationDate: memberData.applicationDate?.toDate(),
      hireDate: memberData.hireDate?.toDate(),
      firstWorkStartDate: memberData.firstWorkStartDate?.toDate(),
      lastWorkStartDate: memberData.lastWorkStartDate?.toDate(),
      lastSyncedAt: memberData.lastSyncedAt?.toDate(),
      workHistory,
    } as Member & { workHistory: WorkHistory[] });
  }
  
  return membersWithHistory;
}

/**
 * 週次の稼働状況を分析
 */
function analyzeWeeklyWorkStatus(
  members: (Member & { workHistory: WorkHistory[] })[],
  weekStart: Date,
  weekEnd: Date
): {
  totalSummary: WorkStatusSummary;
  newWorkMembers: WorkStatusDetail[];
  switchingMembers: WorkStatusDetail[];
  projectReleasedMembers: WorkStatusDetail[];
  contractTerminatedMembers: WorkStatusDetail[];
} {
  const newWorkMembers: WorkStatusDetail[] = [];
  const switchingMembers: WorkStatusDetail[] = [];
  const projectReleasedMembers: WorkStatusDetail[] = [];
  const contractTerminatedMembers: WorkStatusDetail[] = [];
  
  // 月初（週の開始時点）の稼働メンバー数
  let activeMembers = 0;
  
  for (const member of members) {
    // この週の稼働履歴を確認
    const workHistoryInWeek = member.workHistory.filter(history => {
      const startInWeek = history.startDate >= weekStart && history.startDate <= weekEnd;
      const endInWeek = history.endDate && history.endDate >= weekStart && history.endDate <= weekEnd;
      return startInWeek || endInWeek;
    });
    
    for (const history of workHistoryInWeek) {
      const detail: WorkStatusDetail = {
        memberId: member.id,
        memberName: member.name,
        jobCategory: member.jobCategory,
        projectId: history.projectId,
        projectName: history.projectName,
        statusChangeDate: history.startDate,
        nearestStation: member.nearestStation,
        workDuration: calculateWorkDuration(history),
      };
      
      switch (history.status) {
        case WorkStatus.NEW_WORK:
          newWorkMembers.push(detail);
          break;
        case WorkStatus.SWITCHING:
          const previousProject = getPreviousProject(member, history);
          switchingMembers.push({
            ...detail,
            previousProjectId: previousProject?.projectId,
            previousProjectName: previousProject?.projectName,
          });
          break;
        case WorkStatus.PROJECT_RELEASE:
          projectReleasedMembers.push({
            ...detail,
            statusChangeDate: history.endDate || history.startDate,
            reason: history.endReason,
          });
          break;
        case WorkStatus.CONTRACT_TERMINATION:
          contractTerminatedMembers.push({
            ...detail,
            statusChangeDate: history.endDate || history.startDate,
            reason: history.endReason,
          });
          break;
      }
    }
    
    // 週開始時点で稼働中だったメンバーをカウント
    if (isActiveAtDate(member, weekStart)) {
      activeMembers++;
    }
  }
  
  // 月末（週の終了時点）の稼働メンバー数
  const currentActiveMembers = activeMembers + 
    newWorkMembers.length + 
    switchingMembers.length - 
    projectReleasedMembers.length - 
    contractTerminatedMembers.length;
  
  const netChange = newWorkMembers.length + 
    switchingMembers.length - 
    projectReleasedMembers.length - 
    contractTerminatedMembers.length;
  
  // 離職率と成長率を計算
  const turnoverRate = activeMembers > 0 
    ? ((projectReleasedMembers.length + contractTerminatedMembers.length) / activeMembers) * 100
    : 0;
  
  const growthRate = activeMembers > 0
    ? (netChange / activeMembers) * 100
    : 0;
  
  return {
    totalSummary: {
      newWorkCount: newWorkMembers.length,
      switchingCount: switchingMembers.length,
      projectReleaseCount: projectReleasedMembers.length,
      contractTerminationCount: contractTerminatedMembers.length,
      activeMembers,
      currentActiveMembers,
      netChange,
      turnoverRate: Math.round(turnoverRate * 10) / 10,
      growthRate: Math.round(growthRate * 10) / 10,
    },
    newWorkMembers,
    switchingMembers,
    projectReleasedMembers,
    contractTerminatedMembers,
  };
}

/**
 * 継続率を計算
 */
async function calculateContinuationRates(
  members: (Member & { workHistory: WorkHistory[] })[],
  targetDate: Date
): Promise<ContinuationRates> {
  // 各期間の継続率を計算
  const rate1Month = calculateContinuationRateForPeriod(members, targetDate, 30);
  const rate3Months = calculateContinuationRateForPeriod(members, targetDate, 90);
  const rate6Months = calculateContinuationRateForPeriod(members, targetDate, 180);
  const rate1Year = calculateContinuationRateForPeriod(members, targetDate, 365);
  
  return {
    rate1Month,
    rate3Months,
    rate6Months,
    rate1Year,
  };
}

/**
 * 特定期間の継続率を計算
 */
function calculateContinuationRateForPeriod(
  members: (Member & { workHistory: WorkHistory[] })[],
  targetDate: Date,
  daysAgo: number
): ContinuationRateDetail {
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - daysAgo);
  
  // 対象期間に稼働開始したメンバーを抽出
  const targetMembers = members.filter(member => {
    const firstWork = getFirstWorkHistory(member);
    if (!firstWork) return false;
    
    const workStart = firstWork.startDate;
    return workStart >= startDate && workStart <= targetDate;
  });
  
  // 現在も稼働継続しているメンバーをカウント
  const continuedMembers = targetMembers.filter(member => 
    isActiveAtDate(member, targetDate)
  );
  
  const targetCount = targetMembers.length;
  const continuedCount = continuedMembers.length;
  const rate = targetCount > 0 
    ? (continuedCount / targetCount) * 100
    : 0;
  
  // 職種別内訳
  const byCategory: Record<JobCategory, { targetCount: number; continuedCount: number; rate: number }> = {
    [JobCategory.SNS_OPERATION]: { targetCount: 0, continuedCount: 0, rate: 0 },
    [JobCategory.VIDEO_CREATOR]: { targetCount: 0, continuedCount: 0, rate: 0 },
    [JobCategory.AI_WRITER]: { targetCount: 0, continuedCount: 0, rate: 0 },
    [JobCategory.PHOTOGRAPHY_STAFF]: { targetCount: 0, continuedCount: 0, rate: 0 },
  };
  
  for (const category of Object.values(JobCategory)) {
    const categoryTargets = targetMembers.filter(m => m.jobCategory === category);
    const categoryContinued = continuedMembers.filter(m => m.jobCategory === category);
    
    byCategory[category] = {
      targetCount: categoryTargets.length,
      continuedCount: categoryContinued.length,
      rate: categoryTargets.length > 0
        ? (categoryContinued.length / categoryTargets.length) * 100
        : 0,
    };
  }
  
  return {
    targetCount,
    continuedCount,
    rate: Math.round(rate * 10) / 10,
    byCategory,
  };
}

// ========== ヘルパー関数 ==========

/**
 * 空のサマリーを作成
 */
function createEmptySummary(): WorkStatusSummary {
  return {
    newWorkCount: 0,
    switchingCount: 0,
    projectReleaseCount: 0,
    contractTerminationCount: 0,
    activeMembers: 0,
    currentActiveMembers: 0,
    netChange: 0,
    turnoverRate: 0,
    growthRate: 0,
  };
}

/**
 * 特定日時点でメンバーが稼働中かどうか
 */
function isActiveAtDate(member: Member & { workHistory: WorkHistory[] }, date: Date): boolean {
  // 最新の稼働履歴を確認
  const activeHistory = member.workHistory.find(history => {
    // 開始日が指定日以前で、終了日がないか指定日以降
    return history.startDate <= date && 
           (!history.endDate || history.endDate >= date) &&
           (history.status === WorkStatus.NEW_WORK || history.status === WorkStatus.SWITCHING);
  });
  
  return !!activeHistory;
}

/**
 * 稼働期間を計算（日数）
 */
function calculateWorkDuration(history: WorkHistory): number {
  if (!history.endDate) {
    // 現在も稼働中の場合
    const now = new Date();
    return Math.floor((now.getTime() - history.startDate.getTime()) / (1000 * 60 * 60 * 24));
  }
  return Math.floor((history.endDate.getTime() - history.startDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 前の案件を取得
 */
function getPreviousProject(
  member: Member & { workHistory: WorkHistory[] }, 
  currentHistory: WorkHistory
): WorkHistory | null {
  // 現在の履歴より前の履歴を開始日降順で取得
  const previousHistories = member.workHistory
    .filter(h => h.startDate < currentHistory.startDate)
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  
  return previousHistories[0] || null;
}

/**
 * 最初の稼働履歴を取得
 */
function getFirstWorkHistory(member: Member & { workHistory: WorkHistory[] }): WorkHistory | null {
  const sortedHistory = [...member.workHistory].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );
  
  return sortedHistory.find(h => 
    h.status === WorkStatus.NEW_WORK || h.status === WorkStatus.SWITCHING
  ) || null;
} 