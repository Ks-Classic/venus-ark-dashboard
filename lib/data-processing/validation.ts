import { ApplicationInput, ApplicationStatus, Interview, RejectionReason, SelectionProcess, Source } from '../types/application';
import { JobCategory } from '../types/enums';
import { Timestamp } from 'firebase-admin/firestore';
import { normalizeName } from './normalization';
import logger, { isRecruitmentDebugEnabled } from '../logger';

// ==============================================
// Constants and Mappings
// ==============================================

const JOB_CATEGORY_MAP: { [key: string]: JobCategory } = {
  'SNS運用': JobCategory.SNS_OPERATION,
  '動画編集': JobCategory.VIDEO_CREATOR,
  'ライター': JobCategory.AI_WRITER,
  'AIライター': JobCategory.AI_WRITER,
  '撮影スタッフ': JobCategory.PHOTOGRAPHY_STAFF,
};

const SOURCE_MAP: { [key: string]: Source } = {
  'indeed': Source.INDEED,
  'engage': Source.ENGAGE,
};

const STATUS_MAP: { [key: string]: ApplicationStatus } = {
  '応募': ApplicationStatus.APPLICATION,
  '書類提出': ApplicationStatus.DOCUMENT_SUBMISSION,
  '面接': ApplicationStatus.INTERVIEW,
  '面談確定': ApplicationStatus.INTERVIEW_CONFIRMED,
  '面接実施': ApplicationStatus.INTERVIEW_IMPLEMENTED,
  '採用': ApplicationStatus.HIRED,
  '不採用': ApplicationStatus.REJECTED,
  '辞退': ApplicationStatus.DECLINED,
  '書類落ち': ApplicationStatus.DOCUMENT_REJECTED,
  '応募落ち': ApplicationStatus.APPLICATION_REJECTED,
  '面談不参加': ApplicationStatus.INTERVIEW_NO_SHOW,
  '離脱': ApplicationStatus.WITHDRAWN,
  '内定受諾': ApplicationStatus.OFFER_ACCEPTED,
  '面談調整中': ApplicationStatus.INTERVIEW_SCHEDULING,
  '採用辞退': ApplicationStatus.OFFER_DECLINED
};

// ==============================================
// Helper Functions
// ==============================================

/**
 * Logs a debug message if verbose mode is enabled.
 */
const debugLog = (message: string, data?: any) => {
  if (isRecruitmentDebugEnabled() || process.env.VERBOSE === 'true') {
    if (data !== undefined) {
      logger.debug(data, `[VALIDATION] ${message}`);
    } else {
      logger.debug(`[VALIDATION] ${message}`);
    }
  }
};

function maskName(name?: string): string {
  if (!name) return '';
  const head = name.slice(0, 1);
  return `${head}***`;
}

function maskEmail(email?: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const head = (local || '').slice(0, 1);
  return `${head}***@${domain}`;
}

function getValueWithKey(row: { [key: string]: any }, keys: string[]): { value: string; key?: string } {
  for (const key of keys) {
    if (row[key]) return { value: String(row[key]).trim(), key };
  }
  return { value: '' };
}

export function parseDate(dateValue: any, referenceYear = new Date().getFullYear()): Date | undefined {
  if (!dateValue) return undefined;

  if (dateValue instanceof Timestamp) {
    return dateValue.toDate();
  }
  if (typeof dateValue === 'number' && dateValue > 1) {
    const excelEpoch = new Date(1899, 11, 30);
    const jsDate = new Date(excelEpoch.getTime() + dateValue * 86400000);
    if (!isNaN(jsDate.getTime())) return jsDate;
  }
  const dateStr = String(dateValue).trim();
  if (!dateStr) return undefined;
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
    date = new Date(`${referenceYear}/${dateStr}`);
    if (!isNaN(date.getTime())) return date;
  }
  debugLog(`Could not parse date:`, dateValue);
  return undefined;
}

const getValue = (row: { [key: string]: any }, keys: string[]): string => {
  for (const key of keys) {
    if (row[key]) return String(row[key]).trim();
  }
  return '';
};

const safeParseInt = (value: string): number => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
};

// ==============================================
// Core Validation and Transformation Logic
// ==============================================

export function validateAndTransformSheetData(
  row: { [key: string]: any },
  sourceSheetId: string,
  sourceRowIndex: number,
  timestampMap: Map<string, Timestamp>,
  sheetName: string
): ApplicationInput | null {
  const name = getValue(row, ['氏名', '名前']);
  if (!name) {
    debugLog(`Skipping row ${sourceRowIndex}: Name is missing.`);
    return null;
  }
  const normalizedName = normalizeName(name);

  const jobCategory = (Object.keys(JOB_CATEGORY_MAP).reduce((acc, key) => {
    if (sheetName.includes(key)) return JOB_CATEGORY_MAP[key];
    return acc;
  }, JobCategory.SNS_OPERATION)) as JobCategory;

  const source = sheetName.toLowerCase().includes('indeed') ? Source.INDEED : Source.ENGAGE;

  const applicationDate = parseDate(getValue(row, ['応募日', '応募日時']));
  const formSubmissionTimestamp = timestampMap.get(normalizedName) || (applicationDate ? Timestamp.fromDate(applicationDate) : Timestamp.now());

  const statusMatch = getValueWithKey(row, ['ステータス', '選考状況']);
  const statusString = statusMatch.value;
  const status = STATUS_MAP[statusString] || ApplicationStatus.APPLICATION;

  // 各段階の日付（エイリアスを拡充）
  const aliasDocSubmit = [
    '書類提出日', '書類提出', '提出日', 'フォーム提出日',
    '書類提出日時', '提出日時', '書類提出完了日', '書類提出完了'
  ];
  const aliasInterviewPlanned = [
    '面接日1', '面接日時', '面談予定日時', '面談日時', '一次面談日', '一次面接日', '面談日', '面接日',
    '面接予定日', '面談予定日', '面接予定', '面談予定', '面接スケジュール', '面談スケジュール'
  ];
  const aliasInterviewDone = [
    '面接実施日', '面談実施日', '実施日', '面談実施',
    '面接完了日', '面談完了日', '面接実施日時', '面談実施日時',
    '面接実施', '面談実施', '面接完了', '面談完了'
  ];
  const aliasHire = [
    '採用日', '入社日', '採用決定日', '採用決定',
    '採用完了日', '採用日時', '採用確定日', '採用確定'
  ];
  const aliasAccepted = [
    '内定受諾日', '内定承諾日', '承諾日', '受諾日',
    '内定受諾', '内定承諾', '受諾完了日', '内定受諾完了',
    '内定承諾完了', '受諾確定日'
  ];
  const aliasDeclined = [
    '辞退日', '辞退日時', '辞退確定日', '辞退完了日'
  ];

  const docSubmitMatch = getValueWithKey(row, aliasDocSubmit);
  const interviewPlannedMatch = getValueWithKey(row, aliasInterviewPlanned);
  const interviewDoneMatch = getValueWithKey(row, aliasInterviewDone);
  const hireMatch = getValueWithKey(row, aliasHire);
  const acceptedMatch = getValueWithKey(row, aliasAccepted);
  const declinedMatch = getValueWithKey(row, aliasDeclined);

  const docSubmit = parseDate(docSubmitMatch.value);
  const interviewPlanned = parseDate(interviewPlannedMatch.value);
  const interviewDone = parseDate(interviewDoneMatch.value);
  const hire = parseDate(hireMatch.value);
  const accepted = parseDate(acceptedMatch.value);
  const declined = parseDate(declinedMatch.value);

  const interviews: Interview[] = [];
  if (interviewPlanned) {
    interviews.push({ date: Timestamp.fromDate(interviewPlanned), result: getValue(row, ['面接結果1', '選考結果']) || '未定' });
  }

  const selectionProcess: SelectionProcess = {
    status,
    history: [{ status, date: formSubmissionTimestamp }],
    interviews,
  };

  const rejectionReasonString = getValue(row, ['不採用理由', '辞退理由']);
  const rejectionReason = rejectionReasonString as RejectionReason;
  const rejectionDetails = getValue(row, ['不採用詳細', '理由詳細']);

  const applicationInput: ApplicationInput = {
    id: `${sourceSheetId}-${sourceRowIndex}`,
    name,
    email: getValue(row, ['メールアドレス']),
    phone: getValue(row, ['電話番号']),
    jobCategory,
    source,
    applicationDate: applicationDate ? Timestamp.fromDate(applicationDate) : null,
    formSubmissionTimestamp,
    status,
    selectionProcess,
    rejectionReason,
    rejectionDetails,
    isDuplicate: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    sourceInfo: { sheetId: sourceSheetId, sheetName, rowIndex: sourceRowIndex },
    documentScreener: '',
    interviewer: [],
    documentSubmitDate: docSubmit ? Timestamp.fromDate(docSubmit) : null,
    interviewDate: interviewPlanned ? Timestamp.fromDate(interviewPlanned) : null,
    interviewImplementedDate: interviewDone ? Timestamp.fromDate(interviewDone) : null,
    offerDate: null,
    hireDate: hire ? Timestamp.fromDate(hire) : null,
    acceptanceDate: accepted ? Timestamp.fromDate(accepted) : null,
    declineDate: declined ? Timestamp.fromDate(declined) : null,
    notes: getValue(row, ['備考']),
  };

  if (isRecruitmentDebugEnabled()) {
    logger.debug({
      sheetName,
      sourceRowIndex,
      nameMasked: maskName(name),
      emailMasked: maskEmail(getValue(row, ['メールアドレス'])),
      jobCategory,
      statusString,
      statusSourceKey: statusMatch.key,
      status,
      headerMatches: {
        docSubmit: docSubmitMatch.key,
        interviewPlanned: interviewPlannedMatch.key,
        interviewDone: interviewDoneMatch.key,
        hire: hireMatch.key,
        accepted: acceptedMatch.key,
        declined: declinedMatch.key,
      },
      parsedFlags: {
        applicationDate: !!applicationDate,
        docSubmit: !!docSubmit,
        interviewPlanned: !!interviewPlanned,
        interviewDone: !!interviewDone,
        hire: !!hire,
        accepted: !!accepted,
        declined: !!declined,
      },
    }, '[VALIDATION] processed row');
    if (!statusMatch.key) {
      logger.warn({ sheetName, sourceRowIndex, statusString }, '[VALIDATION] status header not matched, using fallback');
    }
    const missingStages: string[] = [];
    if (!docSubmit && !docSubmitMatch.key) missingStages.push('docSubmit:header_not_found');
    if (!interviewPlanned && !interviewPlannedMatch.key) missingStages.push('interviewPlanned:header_not_found');
    if (!interviewDone && !interviewDoneMatch.key) missingStages.push('interviewDone:header_not_found');
    if (!hire && !hireMatch.key) missingStages.push('hire:header_not_found');
    if (!accepted && !acceptedMatch.key) missingStages.push('accepted:header_not_found');
    if (missingStages.length > 0) {
      logger.warn({ sheetName, sourceRowIndex, missingStages }, '[VALIDATION] missing stage headers');
    }
  }
  debugLog(`Processed row ${sourceRowIndex}:`, applicationInput);
  return applicationInput;
}

export function validateApplicationInput(input: ApplicationInput): boolean {
  if (!input.name || !input.jobCategory || !input.source) {
    debugLog('Invalid ApplicationInput: Missing core fields', { name: input.name, jobCategory: input.jobCategory, source: input.source });
    return false;
  }
  return true;
}