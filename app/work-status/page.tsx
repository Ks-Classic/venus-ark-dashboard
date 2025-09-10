'use client';

import { WorkStatusDashboard } from '@/components/work-status-dashboard';
import { PeriodSelector, usePeriodSelection } from '@/components/ui/period-selector';

export default function WorkStatusPage() {
  const {
    selectedYear,
    selectedMonth,
    selectedWeekInMonth,
    setSelectedYear,
    setSelectedMonth,
    setSelectedWeekInMonth
  } = usePeriodSelection();

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <PeriodSelector
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedWeekInMonth={selectedWeekInMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
          onWeekChange={setSelectedWeekInMonth}
        />
      </div>
      
      <WorkStatusDashboard 
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        selectedWeek={selectedWeekInMonth}
      />
    </div>
  );
} 