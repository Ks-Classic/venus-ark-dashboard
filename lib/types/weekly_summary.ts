export interface WeeklySummary {
  id: string; // "2025-W22" 形式
  year: number;
  weekNumber: number;
  lastUpdated: Date;
  jobCategories: {
    [jobCategory: string]: {
      applications: number;
      interviews: number;
      hires: number;
      conversionRate: number; // 面接率
      hireRate: number; // 採用率
    };
  };
  totals: {
    applications: number;
    interviews: number;
    hires: number;
    conversionRate: number;
    hireRate: number;
  };
}

export interface WeeklySummaryInput {
  year: number;
  weekNumber: number;
  jobCategories: {
    [jobCategory: string]: {
      applications: number;
      interviews: number;
      hires: number;
    };
  };
} 