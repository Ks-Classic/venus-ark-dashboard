// 採用ダッシュボードで使用される定数

export const JOB_CATEGORY_TABS = [
  { id: 'all', label: '全職種' },
  { id: 'SNS運用', label: 'SNS運用' },
  { id: '動画クリエイター', label: '動画クリエイター' },
  { id: 'AIライター', label: 'AIライター' },
  { id: '撮影スタッフ', label: '撮影スタッフ' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'all', label: '全て' },
  { value: 'applied', label: '応募' },
  { value: 'interview', label: '面接' },
  { value: 'offer', label: '内定' },
  { value: 'hired', label: '採用' },
  { value: 'rejected', label: '不採用' }
] as const;

export const TABLE_COLUMNS = [
  { key: 'name', label: '名前' },
  { key: 'email', label: 'メールアドレス' },
  { key: 'phone', label: '電話番号' },
  { key: 'jobCategory', label: '職種' },
  { key: 'status', label: 'ステータス' },
  { key: 'appliedDate', label: '応募日' },
  { key: 'actions', label: 'アクション' }
] as const;

export const API_ENDPOINTS = {
  APPLICATIONS: '/api/recruitment/applications',
  SYNC: '/api/sync/recruitment',
  WEEKLY_REPORTS: '/api/recruitment/weekly-reports',
  COMMENTS: '/api/recruitment/comments'
} as const;

export const DEFAULT_FILTERS = {
  jobCategory: 'all',
  status: 'all',
  dateRange: {
    from: null,
    to: null
  }
} as const;

export const MODAL_TYPES = {
  DETAIL: 'detail',
  COMMENT: 'comment',
  EDIT: 'edit'
} as const;
