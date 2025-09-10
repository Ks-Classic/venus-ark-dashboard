// Venus Ark 面談記録（Meeting Record）型定義

export interface MeetingRecord {
  // 基本情報
  id: string; // FirestoreドキュメントID
  notionId?: string; // NotionデータベースのページID
  title: string; // 面談タイトル
  
  // 面談詳細
  type: MeetingType; // 面談種別
  date: Date; // 面談日時
  duration?: number; // 面談時間（分）
  location?: string; // 面談場所（オンライン/対面）
  
  // 参加者情報
  memberId: string; // メンバーID
  memberName: string; // メンバー名
  interviewerId?: string; // 面談者ID
  interviewerName?: string; // 面談者名
  
  // 面談内容
  agenda?: string; // アジェンダ
  summary?: string; // 要約
  details?: string; // 詳細議事録
  aiSummary?: string; // AI要約（Gemini生成）
  
  // 面談結果・アクション
  result?: MeetingResult; // 面談結果
  nextActions?: NextAction[]; // ネクストアクション
  followUpDate?: Date; // フォローアップ予定日
  
  // リスク評価（月次面談・フォロー面談用）
  riskLevel?: RiskLevel; // リスクレベル
  riskFactors?: string[]; // リスク要因
  retentionScore?: number; // 継続可能性スコア（1-10）
  
  // 関連情報
  relatedProjectId?: string; // 関連案件ID（案件面談の場合）
  previousMeetingId?: string; // 前回面談ID
  
  // 文字起こし関連
  transcriptionUrl?: string; // 文字起こしファイルURL（Googleドライブ）
  transcriptionStatus?: TranscriptionStatus;
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date; // Notionとの最終同期日時
}

// 面談種別
export enum MeetingType {
  RECRUITMENT_INTERVIEW = 'recruitment_interview', // 採用面談
  INITIAL_COUNSELING = 'initial_counseling', // 初回カウンセリング
  PROJECT_INTERVIEW = 'project_interview', // 案件面談
  MONTHLY_MEETING = 'monthly_meeting', // 月次面談
  FOLLOW_UP = 'follow_up', // フォロー面談
  EXIT_INTERVIEW = 'exit_interview', // 退職面談
}

// 面談結果
export enum MeetingResult {
  PASSED = 'passed', // 合格（採用面談）
  FAILED = 'failed', // 不合格（採用面談）
  CONTINUE = 'continue', // 継続（月次面談）
  NEEDS_SUPPORT = 'needs_support', // 要サポート
  AT_RISK = 'at_risk', // 離脱リスクあり
  OTHER = 'other', // その他
}

// リスクレベル
export enum RiskLevel {
  LOW = 'low', // 低
  MEDIUM = 'medium', // 中
  HIGH = 'high', // 高
  CRITICAL = 'critical', // 危機的
}

// 文字起こしステータス
export enum TranscriptionStatus {
  NOT_STARTED = 'not_started', // 未開始
  IN_PROGRESS = 'in_progress', // 処理中
  COMPLETED = 'completed', // 完了
  FAILED = 'failed', // 失敗
}

// ネクストアクション
export interface NextAction {
  id: string;
  action: string; // アクション内容
  assignee?: string; // 担当者
  dueDate?: Date; // 期限
  status: ActionStatus;
  completedAt?: Date;
}

// アクションステータス
export enum ActionStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// 面談分析サマリー（AI分析用）
export interface MeetingAnalysis {
  meetingId: string;
  sentiment: 'positive' | 'neutral' | 'negative'; // 感情分析
  keyTopics: string[]; // 主要トピック
  concerns: string[]; // 懸念事項
  strengths: string[]; // 強み・ポジティブ要素
  recommendedActions: string[]; // 推奨アクション
  continuationProbability: number; // 継続確率（0-1）
} 