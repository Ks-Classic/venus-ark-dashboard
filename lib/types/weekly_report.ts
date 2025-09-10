import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { JobCategory } from './enums';

// レポート種別の型定義
export type ReportType = 'recruitment' | 'staff_status' | 'initiatives';

// 不採用理由別内訳の型定義
export interface RejectionBreakdown {
  experienced: number;        // 経験者
  elderly: number;           // 高齢
  unsuitable: number;        // 不適合
  foreign: number;           // 外国籍
  relocation_check: number;  // 上京確認
  post_offer_withdrawal: number; // 受諾後辞退
  other: number;            // その他
}

// 採用関連メトリクスの型定義
export interface RecruitmentMetrics {
  // v2新フィールド（採用ダッシュボードv2対応）
  applyCount: number;           // 応募数
  applyRejectCount: number;     // 内不採用数（応募段階）
  applyContinueCount: number;   // 内選考継続数（応募段階）
  documentSubmitted: number;    // 書類提出数
  documentRejectCount: number;  // 内不採用数（書類段階）
  documentContinueCount: number; // 内選考継続数（書類段階）
  interviewScheduled: number;   // 面接予定数
  interviewConducted: number;   // 内面接実施数
  interviewCancelled: number;   // 内面接辞退数
  hireCount: number;            // 採用者数
  offerAcceptedCount: number;   // 内定受諾数
  
  rejectionBreakdown: RejectionBreakdown;
  interviewRate: number;        // 面接実施率
  hireRate: number;             // 採��率
  acceptanceRate: number;       // 内定受諾率
}

// 稼働者関連メトリクスの型定義
export interface StaffMetrics {
  totalStaff: number;         // 総稼働者数
  newStarts: number;          // 新規開始人数
  switches: number;           // 切替完了人数
  endings: number;            // 終了人数
  projectEndings: number;     // 案件終了人数
  contractEndings: number;    // 契約終了人数
  counselingStarts: number;   // カウンセリング開始人数
  otherExits: number;         // その他離脱人数
}

// 週次レポートのメインインターフェース
export interface WeeklyReport {
  id: string;                    // "YYYY-WSS-JOB_CATEGORY" または "YYYY-WSS-REPORT_TYPE" 形式
  weekId?: string;               // "YYYY-MM-DD" (週の開始日、新しいID体系)
  displayWeekLabel?: string;     // "4月5W / 5月1W" (UI表示用)
  reportType: ReportType;        // レポート種別
  year: number;                  // 2025
  weekNumber: number;            // 3 (第3週)
  startDate: string;             // 週開始日 (土曜日) YYYY-MM-DD
  endDate: string;               // 週終了日 (金曜日) YYYY-MM-DD
  jobCategory?: JobCategory;     // 採用レポートの場合
  recruitmentMetrics?: RecruitmentMetrics;
  staffMetrics?: StaffMetrics;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  generatedAt: Timestamp | FieldValue;
  isManuallyEdited: boolean;    // 手動編集フラグ
}

// 週次レポート作成用の入力型
export interface WeeklyReportInput {
  reportType: ReportType;
  year: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  jobCategory?: JobCategory;
  recruitmentMetrics?: RecruitmentMetrics;
  staffMetrics?: StaffMetrics;
} 