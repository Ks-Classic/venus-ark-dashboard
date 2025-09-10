import React from 'react';
import { RecruitmentCollectionTable } from '../recruitment-collection-table';
import { RecruitmentInterviewTable } from '../recruitment-interview-table';
import { RejectionReasonTable } from '../rejection-reason-table';
import { WeeklyReport } from '@/lib/types/weekly_report';
import { CellData } from '@/lib/types/recruitment_dashboard';

interface ReportsGridProps {
  reports: WeeklyReport[];
  onNumberClick: (cellData: CellData) => void;
  selectedYear: number;
  selectedMonth: number;
  selectedWeek: number;
}

export function ReportsGrid({ 
  reports, 
  onNumberClick, 
  selectedYear, 
  selectedMonth, 
  selectedWeek 
}: ReportsGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <RecruitmentCollectionTable 
        reports={reports} 
        onNumberClick={onNumberClick}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        selectedWeek={selectedWeek}
      />
      <RecruitmentInterviewTable 
        reports={reports} 
        onNumberClick={onNumberClick} 
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        selectedWeek={selectedWeek}
      />
      <RejectionReasonTable 
        reports={reports} 
        onNumberClick={onNumberClick} 
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        selectedWeek={selectedWeek}
      />
    </div>
  );
}
