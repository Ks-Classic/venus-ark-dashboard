import useSWR from 'swr';
import { WeeklyReport } from '@/lib/types/weekly_report';
import { JobCategory } from '@/lib/types/enums';
import { getWeekDateRange, getWeekNumberFromDate } from '@/lib/date';

export interface UseWeeklyReportsProps {
  selectedYear: number;
  selectedMonth: number;
  selectedWeek: number;
  jobCategory?: JobCategory | 'all';
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object.
    (error as any).info = res.statusText;
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
});

export function useWeeklyReports({
  selectedYear,
  selectedMonth,
  selectedWeek,
  jobCategory,
}: UseWeeklyReportsProps) {
  const keys: string[] = [];
  if (selectedYear && selectedMonth && selectedWeek) {
    const { start: currentWeekStart } = getWeekDateRange(selectedYear, selectedMonth, selectedWeek);
    for (let i = 0; i < 4; i++) {
      const targetDate = new Date(currentWeekStart);
      targetDate.setDate(currentWeekStart.getDate() - (i * 7));
      const weekInfo = getWeekNumberFromDate(targetDate);
      
      const weekSelector = `${weekInfo.month}月${weekInfo.weekInMonth}W`;
      const params = new URLSearchParams({
        weekSelector: weekSelector,
        year: String(weekInfo.year),
        month: String(weekInfo.month),
        weekInMonth: String(weekInfo.weekInMonth),
        platform: 'all',
      });
      if (jobCategory && jobCategory !== 'all') {
        params.append('jobCategory', jobCategory);
      } else {
        params.append('jobCategory', 'all');
      }
      keys.push(`/api/recruitment/gas-weekly-reports?${params.toString()}`);
    }
  }

  if (keys.length > 0) {
    console.log('[SWR] keys for weekly reports', keys);
  }

  const { data: results, error, isLoading, mutate } = useSWR(keys, (urls: string[]) => 
    Promise.all(urls.map(url => fetcher(url).catch(e => {
      console.warn('[SWR] fetch failed', { url, error: e });
      return []; // 1つのAPIが失敗しても、全体が失敗しないようにする
    })))
  );

  const flat = Array.isArray(results) ? (results.flat() as WeeklyReport[]) : [];
  if (results) {
    console.log('[SWR] raw results', results);
    console.log('[SWR] flattened', flat);
  }
  // デバッグ: UI描画前の合算チェック
  if (process.env.NEXT_PUBLIC_RECRUITMENT_DEBUG === 'true' && flat.length > 0) {
    try {
      const sums = flat.reduce((acc, r) => {
        const m: any = (r as any).recruitmentMetrics || {};
        acc.applyCount += m.applyCount || 0;
        acc.documentSubmitted += m.documentSubmitted || 0;
        acc.interviewScheduled += m.interviewScheduled || 0;
        acc.interviewConducted += m.interviewConducted || 0;
        acc.hireCount += m.hireCount || 0;
        acc.offerAcceptedCount += m.offerAcceptedCount || 0;
        return acc;
      }, { applyCount: 0, documentSubmitted: 0, interviewScheduled: 0, interviewConducted: 0, hireCount: 0, offerAcceptedCount: 0 });
      console.debug('[UI-CHECK] aggregated sums before render', sums);

      // 各レポートの率を再計算して比較（丸め前）
      flat.forEach((r) => {
        const m: any = (r as any).recruitmentMetrics || {};
        const calcInterviewRate = m.interviewScheduled > 0 ? (m.interviewConducted / m.interviewScheduled) * 100 : 0;
        const calcAcceptanceRate = m.hireCount > 0 ? (m.offerAcceptedCount / m.hireCount) * 100 : 0;
        const nearEq = (a: number, b: number) => Math.abs(a - b) <= 0.5; // 許容差
        if (!nearEq(calcInterviewRate, m.interviewRate || 0) || !nearEq(calcAcceptanceRate, m.acceptanceRate || 0)) {
          console.warn('[UI-CHECK] rate mismatch', {
            id: (r as any).id,
            calcInterviewRate,
            apiInterviewRate: m.interviewRate,
            calcAcceptanceRate,
            apiAcceptanceRate: m.acceptanceRate,
          });
        }
      });
    } catch {}
  }

  // レポートID/年月週の必須フィールドを満たすもののみ採用
  const weeklyData = flat.filter(r => r && r.id && typeof r.year === 'number' && typeof (r as any).month === 'number' && typeof (r as any).weekInMonth === 'number');
  
  if (jobCategory === 'all' && weeklyData.length > 0) {
    const aggregatedByWeek = weeklyData.reduce((acc, report) => {
      const wkYear = (report as any).year;
      const wkMonth = (report as any).month;
      const wkInMonth = (report as any).weekInMonth;
      const weekKey = `${wkYear}-${wkMonth}-${wkInMonth}`;
      if (!acc[weekKey]) {
        const zeroMetrics = {
          applyCount: 0,
          applyRejectCount: 0,
          applyContinueCount: 0,
          documentSubmitted: 0,
          documentRejectCount: 0,
          documentContinueCount: 0,
          interviewScheduled: 0,
          interviewConducted: 0,
          interviewCancelled: 0,
          hireCount: 0,
          offerAcceptedCount: 0,
          interviewRate: 0,
          hireRate: 0,
          acceptanceRate: 0,
          rejectionBreakdown: {
            experienced: 0,
            elderly: 0,
            unsuitable: 0,
            foreign: 0,
            relocation_check: 0,
            post_offer_withdrawal: 0,
            other: 0,
          },
        } as any;
        acc[weekKey] = {
          ...(report as any),
          id: `${weekKey}-aggregated`,
          jobCategory: 'all',
          recruitmentMetrics: zeroMetrics,
          // 週メタ情報の揃え込み
          year: wkYear,
          month: wkMonth,
          weekInMonth: wkInMonth,
          displayWeekLabel: `${wkMonth}月${wkInMonth}W`,
          weekId: `${wkYear}-${String(wkMonth).padStart(2,'0')}-W${String(wkInMonth).padStart(2,'0')}`,
        } as any;
      }
      const target = (acc[weekKey] as any).recruitmentMetrics || {};
      const source = (report as any).recruitmentMetrics || {};
      Object.keys(source).forEach((key) => {
        if (key !== 'rejectionBreakdown' && typeof (source as any)[key] === 'number') {
          (target as any)[key] = ((target as any)[key] || 0) + (source as any)[key];
        }
      });
      if (source.rejectionBreakdown) {
        (target as any).rejectionBreakdown = (target as any).rejectionBreakdown || {};
        Object.keys(source.rejectionBreakdown).forEach(k => {
          (target as any).rejectionBreakdown[k] = ((target as any).rejectionBreakdown[k] || 0) + (source.rejectionBreakdown as any)[k];
        });
      }
      (acc[weekKey] as any).recruitmentMetrics = target;
      return acc;
    }, {} as Record<string, WeeklyReport>);

    const finalData = Object.values(aggregatedByWeek);
    finalData.sort((a, b) => new Date((a as any).startDate).getTime() - new Date((b as any).startDate).getTime());
    console.log('[SWR] aggregated weeklyData (jobCategory=all)', finalData);
    return { weeklyData: finalData, loading: isLoading, error: error ? (error as any).message : null, mutate };
  }

  weeklyData.sort((a, b) => new Date((a as any).startDate).getTime() - new Date((b as any).startDate).getTime());
  if (weeklyData.length > 0) {
    console.log('[SWR] weeklyData (category specific)', weeklyData);
  }

  return {
    weeklyData,
    loading: isLoading,
    error: error ? (error as any).message : null,
    mutate,
  };
}