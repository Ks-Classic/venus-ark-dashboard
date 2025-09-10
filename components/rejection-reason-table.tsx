'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WeeklyReport } from '@/lib/types/weekly_report';
import { CellData } from '@/lib/types/recruitment_dashboard';
import { getWeekDateRange, getWeekNumberFromDate } from '@/lib/date';

interface RejectionReasonTableProps {
  reports: WeeklyReport[];
  onNumberClick: (data: CellData) => void;
  selectedYear: number;
  selectedMonth: number;
  selectedWeek: number;
}

// テーブルに表示する指標の定義（修正後）
const METRICS = [
  { key: 'experienced', label: '経験者' },
  { key: 'elderly', label: '高齢' },
  { key: 'unsuitable', label: '不適合' },
  { key: 'foreign', label: '外国籍' },
  { key: 'relocation_check', label: '転居確認' },
  { key: 'post_offer_withdrawal', label: '内定後辞退' },
  { key: 'other', label: 'その他' },
];

export function RejectionReasonTable({
  reports,
  onNumberClick,
  selectedYear,
  selectedMonth,
  selectedWeek,
}: RejectionReasonTableProps) {

  const displayReports = useMemo(() => {
    const weeks = [];
    const { start: currentWeekStart } = getWeekDateRange(selectedYear, selectedMonth, selectedWeek);
    for (let i = 0; i < 4; i++) {
      const targetDate = new Date(currentWeekStart);
      targetDate.setDate(currentWeekStart.getDate() - (i * 7));
      weeks.push(getWeekNumberFromDate(targetDate));
    }
    weeks.reverse();

    return weeks.map(week => {
      const report = reports.find(r => r.year === week.year && r.month === week.month && r.weekInMonth === week.weekInMonth);
      return report || { year: week.year, month: week.month, weekInMonth: week.weekInMonth, recruitmentMetrics: null };
    });
  }, [reports, selectedYear, selectedMonth, selectedWeek]);

  // 各指標の4週合計を計算
  const calculateTotal = (metricKey: string) => {
    return displayReports.reduce((sum, report) => {
      const value = report?.recruitmentMetrics?.rejectionBreakdown?.[metricKey as keyof typeof report.recruitmentMetrics.rejectionBreakdown] || 0;
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  };

  // クリック可能な数字セル
  const ClickableCell = ({ report, metricKey, label }: { report: Partial<WeeklyReport> | null; metricKey: string; label: string; }) => {
    if (!report?.recruitmentMetrics) {
      return <span className="text-gray-400">-</span>;
    }
    const value = report.recruitmentMetrics?.rejectionBreakdown?.[metricKey as keyof typeof report.recruitmentMetrics.rejectionBreakdown] || 0;
    
    const handleNumberClick = () => {
      if (!report.id) return;
      onNumberClick({
        value: value,
        rowLabel: label,
        weekId: report.id,
        tableType: 'rejection',
        category: 'rejection',
        subCategory: metricKey,
        metric: 'value'
      });
    };

    return (
      <Button
        variant="ghost"
        className="h-8 px-2 text-sm font-medium hover:bg-red-50 hover:text-red-600 transition-colors"
        onClick={handleNumberClick}
      >
        {value}
      </Button>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">不採用者内訳</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 border-b font-medium text-sm text-gray-700">
                  理由
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
                  <td className="py-2 px-3 border-b text-sm font-medium">{label}</td>
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
