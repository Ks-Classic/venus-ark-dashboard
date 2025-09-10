import { Application } from '../types/application';
import { WeeklyReport, RecruitmentMetrics, RejectionBreakdown } from '../types/weekly_report';
import { JobCategory } from '../types/enums';
import { Timestamp } from 'firebase-admin/firestore';
import { getWeekDateRange, getYearWeekNumber, generateWeekKey } from '../date';
import { 
  getApplicationsByDateRange,
  countByDateFieldRange,
  countByStatusUpdatedAtRange,
  getRejectionBreakdownInRange,
  countByFormSubmissionTimestamp,
} from '../firestore/applications';
import logger, { isRecruitmentDebugEnabled } from '../logger';

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value === 'string') return new Date(value);
  if (value instanceof Timestamp) return value.toDate();
  return null;
}

function calculateRecruitmentMetrics(
  applicationsInWeek: Application[],
  weekStart: Date,
  weekEnd: Date
): RecruitmentMetrics {

  const between = (d: any) => {
    const date = toDate(d);
    return !!(date && date >= weekStart && date <= weekEnd);
  };

  const getCountByStatusAndDate = (statuses: string[], dateField: keyof Application) => {
    return applicationsInWeek.filter(app => {
      const appDate = (app as any)[dateField];
      return statuses.includes(app.status as any) && between(appDate);
    }).length;
  };

  const applyCount = applicationsInWeek.length;
  const applyRejectCount = getCountByStatusAndDate(['応募落ち'], 'updatedAt' as any);
  const documentRejectCount = getCountByStatusAndDate(['書類落ち'], 'updatedAt' as any);
  const interviewCancelled = getCountByStatusAndDate(['面談不参加', '離脱'], 'updatedAt' as any);

  const documentSubmitted = applicationsInWeek.filter(app => between((app as any).documentSubmitDate || (app as any).formSubmissionTimestamp)).length;
  const interviewScheduled = applicationsInWeek.filter(app => between((app as any).interviewDate)).length;
  const interviewConducted = applicationsInWeek.filter(app => between((app as any).interviewImplementedDate)).length;
  const hireCount = applicationsInWeek.filter(app => between((app as any).hireDate)).length;
  const offerAcceptedCount = applicationsInWeek.filter(app => between((app as any).acceptanceDate)).length;

  const closedStatuses = ['採用', '不採用', '辞退', '離脱', '応募落ち', '書類落ち', '採用辞退', '面談不参加', '内定受諾'];
  const applyContinueCount = applicationsInWeek.filter(app => !closedStatuses.includes(app.status as any)).length;
  
  const documentContinuingStatuses = ['書類提出', '面談調整中', '面談確定', '面接実施', 'interview', 'final_review'];
  const documentContinueCount = applicationsInWeek.filter(app => documentContinuingStatuses.includes(app.status as any) && !closedStatuses.includes(app.status as any)).length;

  const rejectedThisWeek = applicationsInWeek.filter(app => ['応募落ち', '書類落ち', '不採用'].includes(app.status as any) && (between((app as any).updatedAt) || between((app as any).declineDate)));
  const rejectionBreakdown: RejectionBreakdown = {
    experienced: rejectedThisWeek.filter(a => String((a as any).rejectionReason || '').toLowerCase() === 'experienced').length,
    elderly: rejectedThisWeek.filter(a => String((a as any).rejectionReason || '').toLowerCase() === 'elderly').length,
    unsuitable: rejectedThisWeek.filter(a => String((a as any).rejectionReason || '').toLowerCase() === 'unsuitable').length,
    foreign: rejectedThisWeek.filter(a => String((a as any).rejectionReason || '').toLowerCase() === 'foreign').length,
    relocation_check: rejectedThisWeek.filter(a => String((a as any).rejectionReason || '').toLowerCase() === 'relocation_check').length,
    post_offer_withdrawal: rejectedThisWeek.filter(a => String((a as any).rejectionReason || '').toLowerCase() === 'post_offer_withdrawal').length,
    other: rejectedThisWeek.filter(a => ['experienced','elderly','unsuitable','foreign','relocation_check','post_offer_withdrawal'].indexOf(String((a as any).rejectionReason || '').toLowerCase()) === -1).length,
  };

  const interviewRate = interviewScheduled > 0 ? (interviewConducted / interviewScheduled) * 100 : 0;
  const acceptanceRate = hireCount > 0 ? (offerAcceptedCount / hireCount) * 100 : 0;

  return {
    applyCount,
    applyRejectCount,
    applyContinueCount,
    documentSubmitted,
    documentRejectCount,
    documentContinueCount,
    interviewScheduled,
    interviewConducted,
    interviewCancelled,
    hireCount,
    offerAcceptedCount,
    rejectionBreakdown,
    interviewRate: Math.round(interviewRate * 10) / 10,
    hireRate: 0,
    acceptanceRate: Math.round(acceptanceRate * 10) / 10,
  };
}

export async function generateWeeklyRecruitmentReport(
  year: number,
  month: number,
  weekInMonth: number,
  jobCategory?: JobCategory
): Promise<WeeklyReport> {
  const { start, end } = getWeekDateRange(year, month, weekInMonth);
  const applicationsInWeek = await getApplicationsByDateRange(start, end, jobCategory);

  console.log('[AGG] inputs', { count: applicationsInWeek?.length || 0, year, month, weekInMonth, jobCategory, start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
  if (isRecruitmentDebugEnabled()) {
    const total = applicationsInWeek?.length || 0;
    logger.debug({ total }, '[AGG] applications count');
  }
  if (!applicationsInWeek) {
    const emptyMetrics = calculateRecruitmentMetrics([], start, end);
    const { weekInYear: weekNumber } = getYearWeekNumber(start);
    const weekId = generateWeekKey(year, month, weekInMonth);
    return {
      id: jobCategory ? `${weekId}-${jobCategory}` : weekId,
      reportType: 'recruitment',
      year: year,
      weekNumber,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      jobCategory: jobCategory,
      recruitmentMetrics: emptyMetrics,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      generatedAt: Timestamp.now(),
      isManuallyEdited: false,
    };
  }

  // まず応募日で抽出した集合を用いて継続系の値を計算
  const recruitmentMetrics = calculateRecruitmentMetrics(applicationsInWeek, start, end);

  // 各ステージの実績は該当フィールドの日付で週範囲集計する（応募日の週に限定しない）
  const [
    documentSubmitted,
    interviewScheduled,
    interviewConducted,
    hireCount,
    offerAcceptedCount,
    applyRejectCount,
    documentRejectCount,
    interviewNoShow,
    withdrew,
    rejectionBreakdown
  ] = await Promise.all([
    countByDateFieldRange('documentSubmitDate', start, end, jobCategory),
    countByDateFieldRange('interviewDate', start, end, jobCategory),
    countByDateFieldRange('interviewImplementedDate', start, end, jobCategory),
    countByDateFieldRange('hireDate', start, end, jobCategory),
    countByDateFieldRange('acceptanceDate', start, end, jobCategory),
    countByStatusUpdatedAtRange('応募落ち', start, end, jobCategory),
    countByStatusUpdatedAtRange('書類落ち', start, end, jobCategory),
    countByStatusUpdatedAtRange('面談不参加', start, end, jobCategory),
    countByStatusUpdatedAtRange('離脱', start, end, jobCategory),
    getRejectionBreakdownInRange(start, end, jobCategory),
  ]);

  // documentSubmitted のフォールバック処理
  let finalDocumentSubmitted = documentSubmitted;
  if (documentSubmitted === 0) {
    // formSubmissionTimestamp も対象に追加
    const formBasedCount = await countByFormSubmissionTimestamp(start, end, jobCategory);
    finalDocumentSubmitted = formBasedCount;
    logger.debug({ documentSubmitted, formBasedCount, finalDocumentSubmitted }, 
                 '[AGG] documentSubmitted fallback to formSubmissionTimestamp');
  }
  recruitmentMetrics.documentSubmitted = finalDocumentSubmitted;
  recruitmentMetrics.interviewScheduled = interviewScheduled;
  recruitmentMetrics.interviewConducted = interviewConducted;
  recruitmentMetrics.hireCount = hireCount;
  recruitmentMetrics.offerAcceptedCount = offerAcceptedCount;
  recruitmentMetrics.applyRejectCount = applyRejectCount;
  recruitmentMetrics.documentRejectCount = documentRejectCount;
  recruitmentMetrics.interviewCancelled = interviewNoShow + withdrew;
  recruitmentMetrics.rejectionBreakdown = {
    experienced: rejectionBreakdown.experienced || 0,
    elderly: rejectionBreakdown.elderly || 0,
    unsuitable: rejectionBreakdown.unsuitable || 0,
    foreign: rejectionBreakdown.foreign || 0,
    relocation_check: rejectionBreakdown.relocation_check || 0,
    post_offer_withdrawal: rejectionBreakdown.post_offer_withdrawal || 0,
    other: rejectionBreakdown.other || 0,
  };

  // 差分ログ（応募集合 vs 範囲クエリ）
  if (isRecruitmentDebugEnabled()) {
    const fromApplications = {
      applyCount: applicationsInWeek.length,
      // 応募集合から推定できるステージ数（同週内のフィールド存在で近似）
      documentSubmitted: applicationsInWeek.filter(app => !!(app as any).documentSubmitDate && toDate((app as any).documentSubmitDate) && toDate((app as any).documentSubmitDate)!>= start && toDate((app as any).documentSubmitDate)!<= end).length,
      interviewScheduled: applicationsInWeek.filter(app => !!(app as any).interviewDate && toDate((app as any).interviewDate) && toDate((app as any).interviewDate)!>= start && toDate((app as any).interviewDate)!<= end).length,
      interviewConducted: applicationsInWeek.filter(app => !!(app as any).interviewImplementedDate && toDate((app as any).interviewImplementedDate) && toDate((app as any).interviewImplementedDate)!>= start && toDate((app as any).interviewImplementedDate)!<= end).length,
      hireCount: applicationsInWeek.filter(app => !!(app as any).hireDate && toDate((app as any).hireDate) && toDate((app as any).hireDate)!>= start && toDate((app as any).hireDate)!<= end).length,
      offerAcceptedCount: applicationsInWeek.filter(app => !!(app as any).acceptanceDate && toDate((app as any).acceptanceDate) && toDate((app as any).acceptanceDate)!>= start && toDate((app as any).acceptanceDate)!<= end).length,
    } as any;
    const byRangeQuery = {
      documentSubmitted,
      interviewScheduled,
      interviewConducted,
      hireCount,
      offerAcceptedCount,
      applyRejectCount,
      documentRejectCount,
      interviewCancelled: interviewNoShow + withdrew,
    } as any;
    const keys = ['applyCount','documentSubmitted','interviewScheduled','interviewConducted','hireCount','offerAcceptedCount','applyRejectCount','documentRejectCount','interviewCancelled'] as const;
    const diffs = keys.map(k => ({ metric: k, fromApplications: fromApplications[k] || 0, byRangeQuery: byRangeQuery[k] || 0, functionAggregation: (recruitmentMetrics as any)[k] || 0 }));
    logger.debug({ diffs }, '[AGG] diffs fromApplications vs byRangeQuery vs functionAggregation');
  }

  // 仕様対応: フォーム提出タイムスタンプがある応募者は、
  // 管理シートのステータス更新が未反映でも「書類段階の継続」とみなす。
  // ダブルカウントを避けるため、少なくとも提出数までは継続数に反映する。
  if (typeof recruitmentMetrics.documentContinueCount === 'number') {
    recruitmentMetrics.documentContinueCount = Math.max(
      recruitmentMetrics.documentContinueCount,
      finalDocumentSubmitted
    );
  } else {
    recruitmentMetrics.documentContinueCount = finalDocumentSubmitted;
  }

  const now = Timestamp.now();
  const { weekInYear } = getYearWeekNumber(start);
  const weekId = generateWeekKey(year, month, weekInMonth);

  const result: WeeklyReport = {
    id: jobCategory ? `${weekId}-${jobCategory}` : weekId,
    reportType: 'recruitment',
    year: year,
    weekNumber: weekInYear,
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    jobCategory: jobCategory,
    recruitmentMetrics,
    createdAt: now,
    updatedAt: now,
    generatedAt: now,
    isManuallyEdited: false,
  };
  if (isRecruitmentDebugEnabled()) {
    logger.debug({ metrics: recruitmentMetrics }, '[AGG] result metrics');
  }
  return result;
}
