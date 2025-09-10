import { Client } from '@notionhq/client';
import { Member, WorkHistory } from '@/lib/types/member';
import { Project, WorkStyle, MemberProjectStatus, InterviewResult } from '@/lib/types/project';
import { MemberStatus, JobCategory, WorkStatus, ProjectStatus, MemberProjectRelationStatus } from '@/lib/types/enums';
import { loadNotionMapping } from '../mapping-loader';
import { 
  NOTION_TOKEN, 
  NOTION_MEMBER_DB_ID, 
  NOTION_PROJECT_DB_ID, 
  NOTION_MEMBER_PROJECT_STATUS_DB_ID 
} from '@/lib/config/server-config';

// Notion APIクライアントを初期化
const notion = new Client({ auth: NOTION_TOKEN });

// Notion プロパティマッピングを取得
let notionMapping: any = null;
async function getNotionMapping() {
  if (!notionMapping) {
    notionMapping = await loadNotionMapping();
  }
  return notionMapping;
}

// プロパティ名を取得するヘルパー関数
async function getPropertyName(database: string, key: string): Promise<string> {
  const mapping = await getNotionMapping();
  return mapping[`${database}_database`]?.properties?.[key]?.property_name || key;
}

// プロパティから値を安全に取得するヘルパー関数
async function getPropertyValue(properties: any, database: string, key: string, defaultValue: any = undefined): Promise<any> {
  const propertyName = await getPropertyName(database, key);
  return properties[propertyName] || defaultValue;
}

/**
 * メンバーDBからデータを取得（全データを取得）
 */
export async function fetchMembers(limit?: number): Promise<Member[]> {
  try {
    const allMembers: Member[] = [];
    let hasMore = true;
    let nextCursor: string | undefined = undefined;

    while (hasMore && (!limit || allMembers.length < limit)) {
      const response = await notion.databases.query({
        database_id: NOTION_MEMBER_DB_ID,
        page_size: Math.min(100, limit ? limit - allMembers.length : 100),
        start_cursor: nextCursor,
        // ソートを削除（ページネーション時に問題が発生する可能性があるため）
      });

      const members = await Promise.all(
        response.results.map(async (page) => await parseMember(page as any))
      );
      
      allMembers.push(...members);
      hasMore = response.has_more;
      nextCursor = response.next_cursor || undefined;

      console.log(`メンバーデータ取得中: ${allMembers.length}件`);
    }

    console.log(`✅ 全メンバーデータ取得完了: ${allMembers.length}件`);
    return allMembers;
  } catch (error) {
    console.error('メンバーデータ取得エラー:', error);
    throw error;
  }
}

/**
 * NotionページデータをMemberに変換
 */
async function parseMember(page: any): Promise<Member> {
  const properties = page.properties;
  
  // 名前の抽出と正規化
  const nameProperty = await getPropertyValue(properties, 'member', 'name');
  const name = nameProperty?.title?.[0]?.plain_text || '';
  const normalizedName = normalizeName(name);
  
  // 稼働履歴の取得（ブロックコンテンツから）
  const workHistory = await fetchWorkHistory(page.id);
  
  // 稼働履歴にメンバー名を設定し、案件情報を補完
  workHistory.forEach(history => {
    history.memberName = name;
    // 管理番号から実際の案件名を取得する処理は後で実装
    // 現在は管理番号をそのまま案件名として使用
    if (history.managementNumber && !history.projectName) {
      history.projectName = history.managementNumber;
    }
  });
  
  // ステータスの判定
  const status = determineStatus(properties, workHistory);
  
  // 職種の抽出
  const jobCategoryProperty = await getPropertyValue(properties, 'member', 'job_category');
  const jobCategory = parseJobCategory(jobCategoryProperty?.multi_select || []);
  
  // 稼働履歴から初回稼働開始日を算出
  const firstWorkStartDate = workHistory.length > 0 
    ? new Date(Math.min(...workHistory.map(w => w.startDate.getTime())))
    : undefined;
  
  // 各プロパティを個別に取得
  const emailProperty = await getPropertyValue(properties, 'member', 'email');
  const phoneProperty = await getPropertyValue(properties, 'member', 'phone');
  const applicationDateProperty = await getPropertyValue(properties, 'member', 'application_date');
  const hireDateProperty = await getPropertyValue(properties, 'member', 'hire_date');
  const lastWorkStartDateProperty = await getPropertyValue(properties, 'member', 'last_work_start_date');
  const firstCounselingDateProperty = await getPropertyValue(properties, 'member', 'first_counseling_date');
  const nearestStationProperty = await getPropertyValue(properties, 'member', 'nearest_station');
  const desiredShiftProperty = await getPropertyValue(properties, 'member', 'desired_shift');
  const skillsProperty = await getPropertyValue(properties, 'member', 'skills');
  const learningProgramsProperty = await getPropertyValue(properties, 'member', 'learning_programs');
  const lastWorkEndDateProperty = await getPropertyValue(properties, 'member', 'last_work_end_date');
  const contractEndDateProperty = await getPropertyValue(properties, 'member', 'contract_end_date');
  const desiredJobCategoriesProperty = await getPropertyValue(properties, 'member', 'job_category');
  
  return {
    id: page.id,
    notionId: page.id,
    name,
    normalizedName,
    aliases: [], // 後で名寄せ処理で追加
    email: emailProperty?.email || undefined,
    phone: phoneProperty?.phone_number || undefined,
    applicationDate: parseDate(applicationDateProperty?.date),
    hireDate: parseDate(hireDateProperty?.date),
    firstWorkStartDate, // 稼働履歴から算出
    lastWorkStartDate: parseDate(lastWorkStartDateProperty?.date), // 最新業務開始日
    firstCounselingDate: parseDate(firstCounselingDateProperty?.date),
    nearestStation: nearestStationProperty?.rich_text?.[0]?.plain_text || undefined,
    desiredShift: desiredShiftProperty?.rich_text?.[0]?.plain_text || undefined,
    skills: skillsProperty?.multi_select?.map((s: any) => s.name) || [],
    learningPrograms: learningProgramsProperty?.multi_select?.map((p: any) => p.name) || [],
    status,
    currentProject: workHistory.find(w => w.status === WorkStatus.NEW_WORK || w.status === WorkStatus.SWITCHING)?.projectId,
    lastWorkEndDate: parseDate(lastWorkEndDateProperty?.date),
    contractEndDate: parseDate(contractEndDateProperty?.date),
    jobCategory,
    desiredJobCategories: desiredJobCategoriesProperty?.multi_select?.map((c: any) => parseJobCategory([c])) || [],
    workHistory, // 稼働履歴を含める
    createdAt: new Date(page.created_time),
    updatedAt: new Date(page.last_edited_time),
    lastSyncedAt: new Date(),
  };
}

/**
 * メンバーのブロックコンテンツから稼働履歴を取得（全データを取得）
 */
async function fetchWorkHistory(pageId: string): Promise<WorkHistory[]> {
  try {
    // ページのブロック一覧を取得（ページネーション対応）
    const allBlocks: any[] = [];
    let hasMore = true;
    let nextCursor: string | undefined = undefined;

    while (hasMore) {
      const blocks = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
        start_cursor: nextCursor,
      });

      allBlocks.push(...blocks.results);
      hasMore = blocks.has_more;
      nextCursor = blocks.next_cursor || undefined;
    }

    // テーブルブロックを探す
    const tableBlock = allBlocks.find(
      (block: any) => 'type' in block && block.type === 'table'
    );

    if (!tableBlock || !('type' in tableBlock) || tableBlock.type !== 'table') {
      return [];
    }

    // テーブルの行を取得（ページネーション対応）
    const allTableRows: any[] = [];
    hasMore = true;
    nextCursor = undefined;

    while (hasMore) {
      const tableRows = await notion.blocks.children.list({
        block_id: tableBlock.id,
        page_size: 100,
        start_cursor: nextCursor,
      });

      allTableRows.push(...tableRows.results);
      hasMore = tableRows.has_more;
      nextCursor = tableRows.next_cursor || undefined;
    }

    const workHistoryList: WorkHistory[] = [];
    
    // ヘッダー行をスキップして、データ行を処理
    const dataRows = allTableRows.slice(1);
    
    for (const row of dataRows) {
      if (!('type' in row) || row.type !== 'table_row') continue;
      
      const cells = (row as any).table_row.cells;
      if (cells.length < 5) continue; // 必要な列数がない場合スキップ
      
      const workHistory: WorkHistory = {
        id: row.id,
        memberId: pageId,
        memberName: '', // 後で設定
        projectId: '', // 後で案件名から逆引き
        projectName: cells[0]?.[0]?.plain_text || '', // 管理番号から案件名を取得
        managementNumber: cells[0]?.[0]?.plain_text || undefined, // 列1: 管理番号
        startDate: parseDate(cells[1]?.[0]?.plain_text) || new Date(), // 列2: 開始日
        endDate: parseDate(cells[2]?.[0]?.plain_text), // 列3: 終了日
        endReason: cells[4]?.[0]?.plain_text || undefined, // 列5: 終了理由
        status: determineWorkStatus(cells[4]?.[0]?.plain_text || ''), // 終了理由からステータス判定
        hourlyRate: parseFloat(cells[3]?.[0]?.plain_text || '0') || undefined, // 列4: 単価
        notes: undefined,
      };
      
      workHistoryList.push(workHistory);
    }

    return workHistoryList;
  } catch (error) {
    console.error('稼働履歴取得エラー:', error);
    return [];
  }
}

/**
 * 案件DBからデータを取得（全データを取得）
 */
export async function fetchProjects(limit?: number): Promise<Project[]> {
  try {
    if (!NOTION_PROJECT_DB_ID) {
      throw new Error('NOTION_PROJECT_DB_ID が設定されていません');
    }
    
    // データベース情報を取得
    try {
      const dbInfo = await notion.databases.retrieve({ database_id: NOTION_PROJECT_DB_ID });
      console.log(`[DEBUG] 案件データベース情報: title=${(dbInfo as any).title?.[0]?.plain_text || 'Unknown'}`);
    } catch (error) {
      console.log(`[DEBUG] データベース情報取得エラー: ${error}`);
    }

    const allProjects: Project[] = [];
    let hasMore = true;
    let nextCursor: string | undefined = undefined;
    let loopCount = 0;

    while (hasMore && (!limit || allProjects.length < limit)) {
      loopCount++;
      console.log(`[DEBUG] ループ ${loopCount}回目開始: hasMore=${hasMore}, limit=${limit}, allProjects.length=${allProjects.length}`);
      console.log(`[DEBUG] 案件データ取得リクエスト: cursor=${nextCursor}, page_size=${Math.min(100, limit ? limit - allProjects.length : 100)}`);
      
      const response = await notion.databases.query({
        database_id: NOTION_PROJECT_DB_ID,
        page_size: Math.min(100, limit ? limit - allProjects.length : 100),
        start_cursor: nextCursor,
        // フィルターを一時的に削除（ステータスプロパティの型が異なるため）
      });

      console.log(`[DEBUG] 案件データレスポンス: results=${response.results.length}, has_more=${response.has_more}, next_cursor=${response.next_cursor}`);

      const projects = response.results.map(page => parseProject(page as any));
      allProjects.push(...projects);
      hasMore = response.has_more;
      nextCursor = response.next_cursor || undefined;

      // 最初のバッチで詳細情報を表示
      if (allProjects.length <= 100 && projects.length > 0) {
        console.log(`[DEBUG] サンプル案件データ: ${projects[0].name} (${projects[0].status})`);
      }

      console.log(`案件データ取得中: ${allProjects.length}件 (has_more: ${hasMore})`);
      console.log(`[DEBUG] ループ ${loopCount}回目終了: hasMore=${hasMore}, nextCursor=${nextCursor}`);
    }

    console.log(`[DEBUG] ループ終了: 総ループ回数=${loopCount}, 最終hasMore=${hasMore}, 最終nextCursor=${nextCursor}`);
    console.log(`✅ 全案件データ取得完了: ${allProjects.length}件`);
    return allProjects;
  } catch (error) {
    console.error('案件データ取得エラー:', error);
    throw error;
  }
}

/**
 * NotionページデータをProjectに変換
 */
function parseProject(page: any): Project {
  const properties = page.properties;
  
  return {
    id: page.id,
    notionId: page.id,
    managementNumber: properties['管理番号']?.rich_text?.[0]?.plain_text || 
                     properties['案件番号']?.rich_text?.[0]?.plain_text || 
                     properties['ID']?.rich_text?.[0]?.plain_text || undefined,
    name: properties['案件名']?.title?.[0]?.plain_text || '',
    clientName: properties['クライアント名']?.rich_text?.[0]?.plain_text || '',
    description: properties['案件概要']?.rich_text?.[0]?.plain_text || undefined,
    jobCategory: parseJobCategory(properties['職種']?.select ? [properties['職種'].select] : []),
    requiredSkills: properties['必要スキル']?.multi_select?.map((s: any) => s.name) || [],
    hourlyRate: properties['単価']?.number || 0,
    workLocation: properties['勤務地']?.rich_text?.[0]?.plain_text || undefined,
    workStyle: parseWorkStyle(properties['勤務形態']?.select?.name),
    requiredHoursPerMonth: properties['月間稼働時間']?.number || undefined,
    shiftPattern: properties['シフト']?.rich_text?.[0]?.plain_text || undefined,
    status: parseProjectStatus(properties['ステータス']?.select?.name),
    maxCapacity: properties['最大人数']?.number || undefined,
    currentMembers: properties['現在人数']?.number || 0,
    startDate: parseDate(properties['開始日']?.date),
    endDate: parseDate(properties['終了予定日']?.date),
    createdAt: new Date(page.created_time),
    updatedAt: new Date(page.last_edited_time),
    lastSyncedAt: new Date(),
  };
}

/**
 * メンバー別案件状況管理DBからデータを取得（全データを取得）
 */
export async function fetchMemberProjectStatuses(limit?: number): Promise<MemberProjectStatus[]> {
  try {
    if (!NOTION_MEMBER_PROJECT_STATUS_DB_ID) {
      throw new Error('NOTION_MEMBER_PROJECT_STATUS_DB_ID が設定されていません');
    }

    const allStatuses: MemberProjectStatus[] = [];
    let hasMore = true;
    let nextCursor: string | undefined = undefined;

    while (hasMore && (!limit || allStatuses.length < limit)) {
      const response = await notion.databases.query({
        database_id: NOTION_MEMBER_PROJECT_STATUS_DB_ID,
        page_size: Math.min(100, limit ? limit - allStatuses.length : 100),
        start_cursor: nextCursor,
        // ソートを一時的に削除（更新日時プロパティが見つからないため）
      });

      const statuses = response.results.map(page => parseMemberProjectStatus(page as any));
      allStatuses.push(...statuses);
      hasMore = response.has_more;
      nextCursor = response.next_cursor || undefined;

      console.log(`メンバー別案件状況データ取得中: ${allStatuses.length}件`);
    }

    console.log(`✅ 全メンバー別案件状況データ取得完了: ${allStatuses.length}件`);
    return allStatuses;
  } catch (error) {
    console.error('メンバー別案件状況データ取得エラー:', error);
    throw error;
  }
}

/**
 * NotionページデータをMemberProjectStatusに変換
 */
function parseMemberProjectStatus(page: any): MemberProjectStatus {
  const properties = page.properties;
  
  return {
    id: page.id,
    memberId: properties['メンバー']?.relation?.[0]?.id || '',
    memberName: properties['メンバー名']?.title?.[0]?.plain_text || '',
    projectId: properties['案件']?.relation?.[0]?.id || '',
    projectName: properties['案件名']?.rich_text?.[0]?.plain_text || '',
    status: parseMemberProjectRelationStatus(properties['ステータス']?.select?.name),
    assignedDate: parseDate(properties['アサイン日']?.date),
    startDate: parseDate(properties['稼働開始日']?.date),
    endDate: parseDate(properties['稼働終了日']?.date),
    interviewDate: parseDate(properties['面接日']?.date),
    interviewResult: properties['面接結果']?.select?.name === '合格' ? InterviewResult.PASSED : 
                     properties['面接結果']?.select?.name === '不合格' ? InterviewResult.FAILED : undefined,
    notes: properties['備考']?.rich_text?.[0]?.plain_text || undefined,
    createdAt: new Date(page.created_time),
    updatedAt: new Date(page.last_edited_time),
  };
}

// ========== ヘルパー関数 ==========

/**
 * 名前の正規化
 */
function normalizeName(name: string): string {
  // 全角・半角スペースを除去
  let normalized = name.replace(/[\s　]+/g, '');
  
  // ふりがな（括弧内）を除去
  normalized = normalized.replace(/[（(][^）)]*[）)]/g, '');
  
  // カタカナに統一（必要に応じて）
  // TODO: より高度な正規化が必要な場合は実装
  
  return normalized;
}

/**
 * 日付のパース（テキスト形式にも対応）
 */
function parseDate(dateObj: any): Date | undefined {
  if (!dateObj) return undefined;
  
  // Notion日付オブジェクトの場合
  if (typeof dateObj === 'object' && dateObj.start) {
  const date = new Date(dateObj.start);
  return isNaN(date.getTime()) ? undefined : date;
  }
  
  // テキスト形式の日付の場合
  if (typeof dateObj === 'string') {
    // 「2025/05/13」「2024/12/31」などの形式
    const dateStr = dateObj.trim();
    if (dateStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date;
    }
    
    // 「202/00/00」のような不正な形式はundefinedを返す
    if (dateStr.includes('00/00') || dateStr.startsWith('202/')) {
      return undefined;
    }
    
    // その他の形式も試す
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  }
  
  return undefined;
}

/**
 * 職種カテゴリのパース
 */
function parseJobCategory(multiSelect: any[]): JobCategory {
  const categoryName = multiSelect[0]?.name || '';
  switch (categoryName) {
    case 'SNS運用':
      return JobCategory.SNS_OPERATION;
    case '動画クリエイター':
      return JobCategory.VIDEO_CREATOR;
    case 'AIライター':
      return JobCategory.AI_WRITER;
    case '撮影スタッフ':
      return JobCategory.PHOTOGRAPHY_STAFF;
    default:
      return JobCategory.SNS_OPERATION; // デフォルト
  }
}

/**
 * メンバーステータスの判定
 * Notionメンバーデータベースのステータスフィールドを直接使用
 */
function determineStatus(properties: any, workHistory: WorkHistory[]): MemberStatus {
  // Notionのステータスフィールドから直接取得
  const notionStatus = properties['ステータス']?.status?.name || 
                      properties['Status']?.status?.name ||
                      properties['ステータス']?.select?.name || 
                      properties['Status']?.select?.name;
  
  // デバッグログ: 実際に取得されるステータス値を確認
  if (notionStatus) {
    console.log(`[DEBUG] Notion ステータス値: "${notionStatus}"`);
  } else {
    console.log(`[DEBUG] Notion ステータス値が取得できませんでした。利用可能なプロパティ:`, Object.keys(properties));
  }
  
  if (notionStatus) {
    switch (notionStatus) {
      // 稼働中のステータス（「稼動」に注意）
      case '稼動':
      case '稼働':
      case '稼働中':
      case 'working':
      case 'WORKING':
        console.log(`[DEBUG] 稼働ステータス検出: ${notionStatus}`);
        return MemberStatus.WORKING;
      
      // 学習・研修関連
      case '学習開始':
      case '初回カウンセリング':
      case 'learning_started':
      case 'LEARNING_STARTED':
        console.log(`[DEBUG] 学習開始ステータス検出: ${notionStatus}`);
        return MemberStatus.LEARNING_STARTED;
      case '学習中':
      case 'training':
      case 'TRAINING':
        return MemberStatus.TRAINING;
      
      // 終了・解除関連
      case '終了':
      case '案件解除':
      case 'project_released':
      case 'PROJECT_RELEASED':
        console.log(`[DEBUG] 案件解除ステータス検出: ${notionStatus}`);
        return MemberStatus.PROJECT_RELEASED;
      case '契約解除':
      case 'contract_terminated':
      case 'contract_ended':
        return MemberStatus.CONTRACT_ENDED;
      case '中断':
        console.log(`[DEBUG] 中断ステータス検出: ${notionStatus}`);
        return MemberStatus.INACTIVE;
      
      // 採用活動関連
      case '採用活動中':
      case 'recruiting':
      case 'RECRUITING':
        return MemberStatus.RECRUITING;
      
      // 新しいステータス（案件斡旋〜採用）
      case '案件斡旋':
      case 'job_matching':
      case 'JOB_MATCHING':
        console.log(`[DEBUG] 案件斡旋ステータス検出: ${notionStatus}`);
        return MemberStatus.JOB_MATCHING;
      case '面接対策':
      case 'interview_prep':
      case 'INTERVIEW_PREP':
        console.log(`[DEBUG] 面接対策ステータス検出: ${notionStatus}`);
        return MemberStatus.INTERVIEW_PREP;
      case '面接':
      case 'interview':
      case 'INTERVIEW':
        console.log(`[DEBUG] 面接ステータス検出: ${notionStatus}`);
        return MemberStatus.INTERVIEW;
      case '結果待ち':
      case 'result_waiting':
      case 'RESULT_WAITING':
        console.log(`[DEBUG] 結果待ちステータス検出: ${notionStatus}`);
        return MemberStatus.RESULT_WAITING;
      case '採用':
      case 'hired':
      case 'HIRED':
        console.log(`[DEBUG] 採用ステータス検出: ${notionStatus}`);
        return MemberStatus.HIRED;
      
      default:
        console.log(`[DEBUG] 未知のステータス: "${notionStatus}" -> inactive`);
        return MemberStatus.INACTIVE;
    }
  }
  
  // ステータスが取得できない場合、稼働履歴から判定
  console.log(`[DEBUG] ステータスが取得できないため、稼働履歴から判定`);
  if (workHistory && workHistory.length > 0) {
    const latestWork = workHistory[workHistory.length - 1];
    if (latestWork.status === WorkStatus.NEW_WORK || latestWork.status === WorkStatus.SWITCHING) {
      return MemberStatus.WORKING;
    }
  }
  
  return MemberStatus.INACTIVE;
}

/**
 * 稼働ステータスの判定
 */
function determineWorkStatus(statusText: string): WorkStatus {
  if (statusText.includes('新規')) return WorkStatus.NEW_WORK;
  if (statusText.includes('切り替え')) return WorkStatus.SWITCHING;
  if (statusText.includes('案件解除')) return WorkStatus.PROJECT_RELEASE;
  if (statusText.includes('契約解除')) return WorkStatus.CONTRACT_TERMINATION;
  return WorkStatus.NEW_WORK;
}

/**
 * 案件名から管理番号を抽出（LIV-221などの形式）
 */
function extractManagementNumber(projectName: string): string | undefined {
  // LIV-221, ABC-123などの形式を抽出
  const match = projectName.match(/([A-Z]{2,}-\d{1,4})/);
  return match ? match[1] : undefined;
}

/**
 * 勤務形態のパース
 */
function parseWorkStyle(styleName: string | undefined): WorkStyle {
  switch (styleName) {
    case 'リモート':
      return WorkStyle.REMOTE;
    case '出社':
      return WorkStyle.OFFICE;
    case 'ハイブリッド':
      return WorkStyle.HYBRID;
    default:
      return WorkStyle.REMOTE;
  }
}

/**
 * 案件ステータスのパース
 */
function parseProjectStatus(statusName: string | undefined): ProjectStatus {
  switch (statusName) {
    case '募集中':
      return ProjectStatus.RECRUITING;
    case '稼働中':
      return ProjectStatus.ACTIVE;
    case '一時停止':
      return ProjectStatus.PAUSED;
    case '終了':
      return ProjectStatus.CLOSED;
    default:
      return ProjectStatus.ACTIVE;
  }
}

/**
 * メンバー案件関係ステータスのパース
 */
function parseMemberProjectRelationStatus(statusName: string | undefined): MemberProjectRelationStatus {
  switch (statusName) {
    case '案件紹介済み':
      return MemberProjectRelationStatus.INTRODUCED;
    case '面接予定':
      return MemberProjectRelationStatus.INTERVIEW_SCHEDULED;
    case '面接完了':
      return MemberProjectRelationStatus.INTERVIEW_COMPLETED;
    case '合格':
      return MemberProjectRelationStatus.PASSED;
    case '不合格':
      return MemberProjectRelationStatus.FAILED;
    case '稼働中':
      return MemberProjectRelationStatus.WORKING;
    case '案件解除':
      return MemberProjectRelationStatus.RELEASED;
    default:
      return MemberProjectRelationStatus.INTRODUCED;
  }
} 