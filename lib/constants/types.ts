// 型定義で使用される定数

export const APPLICATION_STATUSES = {
  APPLIED: 'applied',
  INTERVIEW: 'interview',
  OFFER: 'offer',
  HIRED: 'hired',
  REJECTED: 'rejected'
} as const;

export const JOB_CATEGORIES = {
  ENGINEER: 'engineer',
  DESIGNER: 'designer',
  PLANNER: 'planner',
  MARKETER: 'marketer',
  SALES: 'sales',
  OTHER: 'other'
} as const;

export const WORK_STATUSES = {
  PROJECT_RELEASED: 'project_released',
  LEARNING_STARTED: 'learning_started',
  WORKING: 'working',
  JOB_MATCHING: 'job_matching',
  INACTIVE: 'inactive',
  INTERVIEW: 'interview'
} as const;

export const INITIATIVE_STATUSES = {
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  CANCELLED: 'cancelled'
} as const;

export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

export const DATE_FORMATS = {
  DISPLAY: 'YYYY/MM/DD',
  API: 'YYYY-MM-DD',
  TIMESTAMP: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
} as const;
