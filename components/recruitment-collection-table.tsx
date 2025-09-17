'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WeeklyReport } from '@/lib/types/weekly_report';
import { CellData } from '@/lib/types/recruitment_dashboard';
import { getWeekDateRange, getWeekNumberFromDate } from '@/lib/date';
import { SimpleTooltip } from '@/components/ui/simple-tooltip';
import { RECRUITMENT_COLLECTION_METRICS_DEFINITIONS } from '@/lib/constants/recruitment-metrics-definitions';

interface RecruitmentCollectionTableProps {
  reports: WeeklyReport[];
  onNumberClick: (data: CellData) => void;
  selectedYear: number;
  selectedMonth: number;
  selectedWeek: number;
}

// テーブルに表示する指標の定義
const METRICS = [
    { key: 'applyCount', label: '応募数' },
    { key: 'applyRejectCount', label: '応募内不採用数' },
    { key: 'applyContinueCount', label: '選考継続(応募)' },
    { key: 'documentSubmitted', label: '書類提出数' },
    { key: 'documentRejectCount', label: '書類内不採用数' },
    { key: 'documentContinueCount', label: '選考継続(書類)' },
];

export function RecruitmentCollectionTable({
  reports,
  onNumberClick,
  selectedYear,
  selectedMonth,
  selectedWeek,
}: RecruitmentCollectionTableProps) {

  // ★★★★★ 堅牢な表示ロジック（修正後） ★★★★★
  const displayReports = useMemo(() => {
    console.log('[Debug] RecruitmentCollectionTable received reports:', reports);
    const weeks = [];
    // 選択された週を基準に、過去4週間の情報を生成
    const { start: currentWeekStart } = getWeekDateRange(selectedYear, selectedMonth, selectedWeek);
    for (let i = 0; i < 4; i++) {
      const targetDate = new Date(currentWeekStart);
      targetDate.setDate(currentWeekStart.getDate() - (i * 7));
      weeks.push(getWeekNumberFromDate(targetDate));
    }
    weeks.reverse(); // 週を昇順（古い→新しい）に並べる

    // 生成した4週間の情報に、対応するレポートデータを割り当てる
    const mappedReports = weeks.map(week => {
      const report = reports.find(r => r.year === week.year && r.month === week.month && r.weekInMonth === week.weekInMonth);
      // 見つかったレポート、または見つからなかった場合は週情報だけを持つオブジェクトを返す
      return report || { year: week.year, month: week.month, weekInMonth: week.weekInMonth, recruitmentMetrics: null };
    });
    console.log('[Debug] Mapped display reports:', mappedReports);
    return mappedReports;
  }, [reports, selectedYear, selectedMonth, selectedWeek]);
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

  // 各指標の4週合計を計算
  const calculateTotal = (metricKey: string) => {
    return displayReports.reduce((sum, report) => {
      const value = report?.recruitmentMetrics?.[metricKey as keyof typeof report.recruitmentMetrics] || 0;
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  };

  // クリック可能な数字セル
  const ClickableCell = ({ report, metricKey, label }: { report: Partial<WeeklyReport> | null; metricKey: string; label: string; }) => {
    if (!report?.recruitmentMetrics) {
      return <span className="text-gray-400">-</span>;
    }
    const value = (report.recruitmentMetrics as any)?.[metricKey] || 0;
    
    const handleNumberClick = () => {
      if (!report.id) return;
      onNumberClick({
        value: value,
        rowLabel: label,
        weekId: report.id,
        tableType: 'collection',
        category: 'collection',
        subCategory: metricKey,
        metric: 'value'
      });
    };

    return (
      <Button
        variant="ghost"
        className="h-8 px-2 text-sm font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors"
        onClick={handleNumberClick}
      >
        {value}
      </Button>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">採用活動：集客</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 border-b font-medium text-sm text-gray-700">
                  {displayReports[3]?.year || selectedYear}年
                </th>
                {displayReports.map((report, index) => (
                  <th key={index} className="text-center py-2 px-3 border-b font-medium text-sm text-gray-700">
                    {report ? `${report.month}月${report.weekInMonth}W` : '-'}
                  </th>
                ))}
                <th className="text-center py-2 px-3 border-b font-medium text-sm text-gray-700 bg-gray-50">
                  4週合計
                </th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map(({ key, label }) => (
                <tr key={key} className="hover:bg-gray-50">
                  <td className="py-2 px-3 border-b text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <span>{label}</span>
                      <SimpleTooltip 
                        definition={RECRUITMENT_COLLECTION_METRICS_DEFINITIONS[key]?.definition || ''}
                        method={RECRUITMENT_COLLECTION_METRICS_DEFINITIONS[key]?.method || ''}
                      />
                    </div>
                  </td>
                  {displayReports.map((report, index) => (
                    <td key={index} className="text-center py-2 px-3 border-b">
                      <ClickableCell report={report} metricKey={key} label={label} />
                    </td>
                  ))}
                  <td className="text-center py-2 px-3 border-b bg-gray-50 font-medium">
                    {calculateTotal(key)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}