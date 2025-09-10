'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WeeklyReport } from '@/lib/types/weekly_report';
import { CellData } from '@/lib/types/recruitment_dashboard';
import { getWeekDateRange, getWeekNumberFromDate } from '@/lib/date';

interface RecruitmentInterviewTableProps {
  reports: WeeklyReport[];
  onNumberClick: (data: CellData) => void;
  selectedYear: number;
  selectedMonth: number;
  selectedWeek: number;
}

// テーブルに表示する指標の定義（修正後）
const METRICS = [
  { key: 'interviewScheduled', label: '面接予定数' },
  { key: 'interviewConducted', label: '内面接実施数' },
  { key: 'interviewCancelled', label: '内面接辞退数' },
  { key: 'hireCount', label: '採用者数' },
  { key: 'offerAcceptedCount', label: '内定受諾数' },
];

export function RecruitmentInterviewTable({
  reports,
  onNumberClick,
  selectedYear,
  selectedMonth,
  selectedWeek,
}: RecruitmentInterviewTableProps) {

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

  const calculateTotal = (metricKey: string) => {
    return displayReports.reduce((sum, report) => {
      const value = report?.recruitmentMetrics?.[metricKey as keyof typeof report.recruitmentMetrics] || 0;
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  };
  
  const calculateRate = (numeratorKey: string, denominatorKey: string, report?: Partial<WeeklyReport> | null) => {
    const numerator = report ? (report.recruitmentMetrics?.[numeratorKey as keyof typeof report.recruitmentMetrics] || 0) : calculateTotal(numeratorKey);
    const denominator = report ? (report.recruitmentMetrics?.[denominatorKey as keyof typeof report.recruitmentMetrics] || 0) : calculateTotal(denominatorKey);
    
    if (typeof numerator !== 'number' || typeof denominator !== 'number' || denominator === 0) {
      return '-';
    }
    return `${Math.round((numerator / denominator) * 100)}%`;
  };

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
        tableType: 'interview',
        category: 'interview',
        subCategory: metricKey,
        metric: 'value'
      });
    };

    return (
      <Button
        variant="ghost"
        className="h-8 px-2 text-sm font-medium hover:bg-green-50 hover:text-green-600 transition-colors"
        onClick={handleNumberClick}
      >
        {value}
      </Button>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">採用活動：面接</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 border-b font-medium text-sm text-gray-700">
                  指標
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
              <tr className="hover:bg-gray-50 bg-blue-25">
                <td className="py-2 px-3 border-b text-sm font-medium text-blue-700">面接実施率</td>
                {displayReports.map((report, index) => (
                  <td key={index} className="text-center py-2 px-3 border-b text-blue-600 font-medium">
                    {calculateRate('interviewConducted', 'interviewScheduled', report)}
                  </td>
                ))}
                <td className="text-center py-2 px-3 border-b bg-blue-50 font-medium text-blue-700">
                  {calculateRate('interviewConducted', 'interviewScheduled')}
                </td>
              </tr>
              <tr className="hover:bg-gray-50 bg-green-25">
                <td className="py-2 px-3 border-b text-sm font-medium text-green-700">内定受諾率</td>
                {displayReports.map((report, index) => (
                  <td key={index} className="text-center py-2 px-3 border-b text-green-600 font-medium">
                    {calculateRate('offerAcceptedCount', 'hireCount', report)}
                  </td>
                ))}
                <td className="text-center py-2 px-3 border-b bg-green-50 font-medium text-green-700">
                  {calculateRate('offerAcceptedCount', 'hireCount')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}