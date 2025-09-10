import { useState, useEffect } from 'react';
import { JobCategory } from '@/lib/types/enums';
import { generateWeekKey, getWeekNumberFromDate } from '@/lib/date';

// MediaSource型の定義（採用媒体）
type MediaSource = 'indeed' | 'engage' | 'wantedly' | 'youtrust' | 'lapras' | 'その他';

// 最適化されたAPIレスポンス型（実際のレスポンス構造に合わせて修正）
interface OptimizedSummaryResponse {
  metrics: {
    applications: number;
    rejected: number;
    continuing: number;
    documents: number;
    interviews: number;
    interviewsCompleted: number;
    interviewsDeclined: number;
    hired: number;
    accepted: number;
    withdrawn: number;
    rejectionReasons: {
      experienced: number;
      elderly: number;
      unsuitable: number;
      foreign: number;
      other: number;
    };
    conversionRates: {
      applicationToInterview: number;
      interviewToHire: number;
      hireToAcceptance: number;
    };
  };
  displayMetrics: {
    applications: number;
    interviews: number;
    hires: number;
    conversionRate: number;
    hireRate: number;
    acceptanceRate: number;
    sourceBreakdown: {
      [source in MediaSource]?: {
        applications: number;
        interviews: number;
        hires: number;
        enabled: boolean;
      };
    };
  };
  weekInfo: {
    year: number;
    weekNumber: number;
    month: number;
    weekInMonth: number;
    startDate: string;
    endDate: string;
  };
  breakdown: {
    [source in MediaSource]?: {
      applications: number;
      interviews: number;
      hired: number;
      [key: string]: any;
    };
  };
  jobCategory: JobCategory | 'all';
  activeSources: MediaSource[];
}

interface UseOptimizedWeeklySummariesOptions {
  jobCategory?: JobCategory | 'all';
  mediaSources?: MediaSource[];
  year?: number;
  weekNumber?: number;
  limit?: number;
  // 期間選択パラメータを追加
  periodSelection?: {
    year: number;
    month: number;
    weekInMonth: number;
  };
}

interface UseOptimizedWeeklySummariesReturn {
  summaries: OptimizedSummaryResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOptimizedWeeklySummaries(
  options: UseOptimizedWeeklySummariesOptions = {}
): UseOptimizedWeeklySummariesReturn {
  const [summaries, setSummaries] = useState<OptimizedSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      setError(null);

      let currentYear: number;
      let currentMonth: number;
      let currentWeekInMonth: number;

      // 期間選択パラメータがある場合は直接使用
      if (options.periodSelection) {
        currentYear = options.periodSelection.year;
        currentMonth = options.periodSelection.month;
        currentWeekInMonth = options.periodSelection.weekInMonth;
        
        console.log(`[DEBUG] 期間選択: ${currentYear}年${currentMonth}月${currentWeekInMonth}週`);
      } else {
        // デフォルトは現在の月の第1週
        const now = new Date();
        currentYear = now.getFullYear();
        currentMonth = now.getMonth() + 1;
        currentWeekInMonth = 1;
      }

      // 過去4週分のデータを並行取得
      const promises: Promise<OptimizedSummaryResponse | null>[] = [];
      const weeksToFetch: Array<{ year: number; month: number; week: number }> = [];

      // 現在の週の開始日を取得
      const { start: currentWeekStartDate } = getWeekDateRange(currentYear, currentMonth, currentWeekInMonth);

      // 過去4週分の年・月・週を計算
      for (let i = 0; i < 4; i++) {
        const targetDate = new Date(currentWeekStartDate);
        targetDate.setDate(currentWeekStartDate.getDate() - i * 7);
        const weekInfo = getWeekNumberFromDate(targetDate);
        weeksToFetch.push({ year: weekInfo.year, month: weekInfo.month, week: weekInfo.weekInMonth });
      }

      // 週識別子で重複チェック
      const seenWeeks = new Set<string>();
      const uniqueWeeks = weeksToFetch.filter(w => {
        const weekKey = generateWeekKey(w.year, w.month, w.week);
        if (seenWeeks.has(weekKey)) return false;
        seenWeeks.add(weekKey);
        return true;
      });

      // APIコールを並行実行
      for (const weekInfo of uniqueWeeks) {
        const weekKey = generateWeekKey(weekInfo.year, weekInfo.month, weekInfo.week);
        
        const params = new URLSearchParams();
        if (options.jobCategory && options.jobCategory !== 'all') {
          params.append('jobCategory', options.jobCategory);
        }
        if (options.mediaSources && options.mediaSources.length > 0) {
          params.append('mediaSources', options.mediaSources.join(','));
        }
        params.append('weekKey', weekKey);
        params.append('limit', '1');

        console.log(`[DEBUG] Fetching week: ${weekKey} (${weekInfo.year}年${weekInfo.month}月${weekInfo.week}週)`);

        const promise = fetch(`/api/recruitment/optimized-weekly-summaries?${params.toString()}`)
          .then(response => response.json())
          .then(data => {
            if (data.success && data.data.length > 0) {
              return data.data[0] as OptimizedSummaryResponse;
            }
            return null;
          })
          .catch(() => null);

        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const validResults = results.filter(result => result !== null) as OptimizedSummaryResponse[];
      
      console.log(`[DEBUG] 取得成功: ${validResults.length}週分のデータ`);
      validResults.forEach(result => {
        console.log(`[DEBUG] - ${result.weekInfo.year}年${result.weekInfo.month}月第${result.weekInfo.weekInMonth}週: 応募${result.metrics.applications}件, 不採用理由=${JSON.stringify(result.metrics.rejectionReasons)}`);
      });
      
      setSummaries(validResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('最適化された週次サマリー取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [JSON.stringify(options)]);

  return {
    summaries,
    loading,
    error,
    refetch: fetchSummaries,
  };
}

// 従来のWeeklyReportフォーマットに変換するヘルパー関数
export function convertToWeeklyReport(summary: OptimizedSummaryResponse): any {
  return {
    id: `${summary.weekInfo.year}-W${summary.weekInfo.weekNumber.toString().padStart(2, '0')}-${summary.jobCategory}`,
    year: summary.weekInfo.year,
    weekNumber: summary.weekInfo.weekNumber,
    startDate: summary.weekInfo.startDate,
    endDate: summary.weekInfo.endDate,
    jobCategory: summary.jobCategory,
    recruitmentMetrics: {
      applications: summary.displayMetrics.applications,
      interviews: summary.displayMetrics.interviews,
      hires: summary.displayMetrics.hires,
      documents: summary.displayMetrics.interviews, // 面接に進んだ数を書類数として使用
      rejections: summary.displayMetrics.applications - summary.displayMetrics.interviews,
      withdrawals: 0, // 必要に応じて計算
      rejectionBreakdown: {
        experienced: 0,
        elderly: 0,
        unsuitable: 0,
        foreign: 0,
      }
    }
  };
} 