// Venus Ark ダッシュボード - 共通 Enum 定義
// 全プロジェクトで使用される列挙型をここに統合

// ==================== 採用関連 ====================

/**
 * 採用応募ステータス
 * Google Sheets「採用管理」の「現状ステータス」列と対応
 */
export enum ApplicationStatus { 
  APPLICATION = '応募', 
  DOCUMENT_SUBMISSION = '書類提出', 
  INTERVIEW = '面接', 
  INTERVIEW_CONFIRMED = '面談確定',
  INTERVIEW_IMPLEMENTED = '面接実施',
  HIRED = '採用', 
  REJECTED = '不採用', 
  DECLINED = '辞退', 
  DOCUMENT_REJECTED = '書類落ち', 
  APPLICATION_REJECTED = '応募落ち', 
  INTERVIEW_NO_SHOW = '面談不参加',
  WITHDRAWN = '離脱', 
  OFFER_ACCEPTED = '内定受諾',
  FORM_PENDING = 'フォーム回答待ち',
  INTERVIEW_SCHEDULING = '面談調整中',
  OFFER_DECLINED = '採用辞退'
}

/**
 * 不採用理由
 * Google Sheets「採用管理」の「理由」列と対応
 */
export enum RejectionReason { 
  EXPERIENCED = 'experienced',
  ELDERLY = 'elderly',
  UNSUITABLE = 'unsuitable',
  FOREIGN = 'foreign',
  RELOCATION_CHECK = 'relocation_check',
  POST_OFFER_WITHDRAWAL = 'post_offer_withdrawal',
  OTHER = 'other'
}

// ==================== メンバー関連 ====================

/**
 * メンバーステータス
 * Notion「メンバーDB」の「ステータス」プロパティと対応
 * 注意: CONTRACT_TERMINATED は廃止予定、CONTRACT_ENDED を使用
 */
export enum MemberStatus {
  RECRUITING = 'recruiting',           // 採用活動中
  TRAINING = 'training',               // 学習中
  LEARNING_STARTED = 'learning_started', // 学習開始
  WORKING = 'working',                 // 稼働中
  PROJECT_RELEASED = 'project_released', // 案件解除
  CONTRACT_ENDED = 'contract_ended',   // 契約終了
  WORK_ENDED = 'work_ended',          // 業務終了
  INACTIVE = 'inactive',               // 非アクティブ
  // 新しいステータス - 将来見込み算出用
  JOB_MATCHING = 'job_matching',       // 案件斡旋
  INTERVIEW_PREP = 'interview_prep',   // 面接対策
  INTERVIEW = 'interview',             // 面接
  RESULT_WAITING = 'result_waiting',   // 結果待ち
  HIRED = 'hired',                     // 採用
}

/**
 * 稼働状態
 * 稼働履歴の状態変更タイプ
 */
export enum WorkStatus {
  NEW_WORK = 'new_work',                      // 新規稼働
  SWITCHING = 'switching',                    // 切り替え（再稼働）
  PROJECT_RELEASE = 'project_release',        // 案件解除
  CONTRACT_TERMINATION = 'contract_termination', // 契約解除
}

// ==================== 職種関連 ====================

/**
 * 職種カテゴリ
 * 採用・稼働管理の両方で使用
 */
export enum JobCategory {
  SNS_OPERATION = 'SNS運用',
  VIDEO_CREATOR = '動画クリエイター',
  AI_WRITER = 'AIライター',
  PHOTOGRAPHY_STAFF = '撮影スタッフ',
}

// ==================== 案件関連 ====================

/**
 * 案件ステータス
 * Notion「案件DB」の「ステータス」プロパティと対応
 */
export enum ProjectStatus {
  RECRUITING = 'recruiting',  // 募集中
  ACTIVE = 'active',         // 稼働中
  PAUSED = 'paused',         // 一時停止
  CLOSED = 'closed',         // 終了
}

/**
 * メンバーと案件の関係ステータス
 * Notion「メンバー別案件管理DB」で使用
 */
export enum MemberProjectRelationStatus {
  INTRODUCED = 'introduced',                    // 案件紹介済み
  INTERVIEW_SCHEDULED = 'interview_scheduled',  // 面接予定
  INTERVIEW_COMPLETED = 'interview_completed',  // 面接完了
  PASSED = 'passed',                           // 合格
  FAILED = 'failed',                           // 不合格
  WORKING = 'working',                         // 稼働中
  RELEASED = 'released',                       // 案件解除
}

// ==================== レポート関連 ====================

/**
 * 週次レポートの種類
 */
export enum WeeklyReportType {
  RECRUITMENT = 'recruitment',  // 採用レポート
  STAFF_STATUS = 'staff_status', // 稼働者レポート
}

/**
 * リスクレベル
 * 稼働状況分析で使用
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// ==================== 型ガード関数 ====================

/**
 * ApplicationStatus の型ガード
 */
export function isApplicationStatus(value: string): value is ApplicationStatus {
  return Object.values(ApplicationStatus).includes(value as ApplicationStatus);
}

/**
 * JobCategory の型ガード
 */
export function isJobCategory(value: string): value is JobCategory {
  return Object.values(JobCategory).includes(value as JobCategory);
}

/**
 * MemberStatus の型ガード
 */
export function isMemberStatus(value: string): value is MemberStatus {
  return Object.values(MemberStatus).includes(value as MemberStatus);
} 