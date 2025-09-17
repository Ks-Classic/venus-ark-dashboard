import { Member, WorkHistory } from '@/lib/types/member';
import { MemberStatus, WorkStatus, JobCategory } from '@/lib/types/enums';
import { Project } from '@/lib/types/project';
import { 
  WeeklyWorkStatusDetail as OriginalWeeklyWorkStatusDetail,
  WeeklyDetail as OriginalWeeklyDetail,
  FutureWorkersProjection as OriginalFutureWorkersProjection,
  FutureWorkerDetail,
  StartedMemberDetail,
  EndedMemberDetail,
  OtherStatusDetail
} from '@/lib/types/work_status_report';
// import { upsertStaffMetrics } from '@/lib/firestore/weekly_reports'; // TODO: 実装が必要な場合は後で追加
import { startOfWeek, endOfWeek, format, addWeeks, subWeeks, differenceInDays, addMonths, isWithinInterval, addDays, subDays, startOfMonth, endOfMonth, isBefore } from 'date-fns';
import { getWeeksAssignedToMonth, getWeekNumberFromWeekStart } from '@/lib/date';
import { ja } from 'date-fns/locale';

/**
 * サンプル週次稼働状況データ生成
 */
export function generateSampleWeeklyWorkStatus(): OriginalWeeklyWorkStatusDetail {
  return {
    year: 2025,
    month: 5,
    weekDetails: [
      {
        weekLabel: '4月4W',
        weekNumber: 1,
        totalWorkers: 49,
        totalStarted: 3,
        newStarted: 2,
        switching: 1,
        totalEnded: 0,
        projectEnded: 0,
        contractEnded: 0,
        startedMembers: [
          { type: 'new', memberName: '田中太郎' },
          { type: 'new', memberName: '佐藤花子' },
          { type: 'switching', memberName: '山田次郎', previousProject: '前案件' }
        ],
        endedMembers: [],
        otherItems: []
      },
      {
        weekLabel: '4月5W',
        weekNumber: 2,
        totalWorkers: 44,
        totalStarted: 0,
        newStarted: 0,
        switching: 0,
        totalEnded: 5,
        projectEnded: 3,
        contractEnded: 2,
        startedMembers: [],
        endedMembers: [
          { type: 'project', memberName: '伊藤健太', reason: '案件終了' },
          { type: 'project', memberName: '渡辺真理', reason: '案件終了' },
          { type: 'project', memberName: '中村光', reason: '案件終了' },
          { type: 'contract', memberName: '小林誠', reason: '契約終了' },
          { type: 'contract', memberName: '加藤美和', reason: '契約終了' }
        ],
        otherItems: []
      },
      {
        weekLabel: '5月1W',
        weekNumber: 3,
        totalWorkers: 43,
        totalStarted: 1,
        newStarted: 1,
        switching: 0,
        totalEnded: 2,
        projectEnded: 2,
        contractEnded: 0,
        startedMembers: [
          { type: 'new', memberName: '岩田龍香' }
        ],
        endedMembers: [
          { type: 'project', memberName: '森田健', reason: '案件終了' },
          { type: 'project', memberName: '清水美穂', reason: '案件終了' }
        ],
        otherItems: []
      },
      {
        weekLabel: '5月2W(予定)',
        weekNumber: 4,
        totalWorkers: 40,
        totalStarted: 0,
        newStarted: 0,
        switching: 0,
        totalEnded: 3,
        projectEnded: 3,
        contractEnded: 0,
        startedMembers: [],
        endedMembers: [
          { type: 'project', memberName: '橋本直樹', reason: '案件終了' },
          { type: 'project', memberName: '長谷川優', reason: '案件終了' },
          { type: 'project', memberName: '藤田和子', reason: '案件終了' }
        ],
        otherItems: []
      }
    ]
  };
}

/**
 * サンプル将来見込みデータ生成
 */
export function generateSampleFutureProjection(): OriginalFutureWorkersProjection[] {
  return [
    {
      projectionDate: new Date('2025-05-01'),
      totalProjected: 60,
      totalStarting: 21,
      newStarting: 13,
      switchingCompleted: 8,
      totalEndingProjected: 8,
      projectEndingProjected: 6,
      contractEndingProjected: 2,
      details: []
    },
    {
      projectionDate: new Date('2025-06-01'),
      totalProjected: 55,
      totalStarting: 11,
      newStarting: 7,
      switchingCompleted: 4,
      totalEndingProjected: 4,
      projectEndingProjected: 3,
      contractEndingProjected: 1,
      details: []
    },
    {
      projectionDate: new Date('2025-07-01'),
      totalProjected: 50,
      totalStarting: 1,
      newStarting: 1,
      switchingCompleted: 0,
      totalEndingProjected: 0,
      projectEndingProjected: 0,
      contractEndingProjected: 0,
      details: []
    }
  ];
}

/**
 * 期間に基づく週次稼働状況詳細を生成
 */
export function generateWeeklyWorkStatusDetail(
  members: Member[],
  selectedYear: number,
  selectedMonth: number,
  selectedWeek: number
): OriginalWeeklyWorkStatusDetail {
  // 選択週の土曜日を、新ルール（多数決）で指定月に属する週一覧から取得
  const weeksAssigned = getWeeksAssignedToMonth(selectedYear, selectedMonth);
  const targetIndex = Math.max(0, Math.min(selectedWeek - 1, weeksAssigned.length - 1));
  const targetSaturday = new Date(weeksAssigned[targetIndex]?.start || new Date(selectedYear, selectedMonth - 1, 1));

  // 4週間のデータを生成（選択週を3列目に配置）
  const weekDetails: OriginalWeeklyDetail[] = [];
  
  for (let i = -2; i <= 1; i++) {
    const weekSaturday = new Date(targetSaturday);
    weekSaturday.setDate(weekSaturday.getDate() + i * 7);
    
    const weekStart = new Date(weekSaturday);
    const weekEnd = new Date(weekSaturday);
    weekEnd.setDate(weekEnd.getDate() + 6); // 金曜日まで
    
    const isPrediction = i === 1; // 翌週（予定）
    
    // 週ラベルを新ルール（多数決）で生成
    const info = getWeekNumberFromWeekStart(weekStart);
    const weekLabel = `${info.month}月${info.weekInMonth}W${isPrediction ? '(予定)' : ''}`;
    
    // その週の稼働状況を計算
    const weekDetail = calculateWeeklyStatus(members, weekStart, weekEnd, weekLabel, i + 3);
    weekDetails.push(weekDetail);
  }

  const result: OriginalWeeklyWorkStatusDetail = {
    year: selectedYear,
    month: selectedMonth,
    weekDetails
  };

  // 自動的にweekly_reportsに保存（選択週のみ）
  // TODO: upsertStaffMetricsの実装が必要な場合は後で追加
  // const targetWeekNumber = Math.ceil(targetSaturday.getDate() / 7);
  // upsertStaffMetrics(selectedYear, targetWeekNumber, result).catch(error => {
  //   console.error('Staff metrics自動保存に失敗:', error);
  //   // エラーが発生してもメイン処理は継続
  // });

  return result;
}

/**
 * 週次稼働状況を計算
 */
function calculateWeeklyStatus(
  members: Member[],
  weekStart: Date,
  weekEnd: Date,
  label: string,
  weekNumber: number
): OriginalWeeklyDetail {
  console.log(`[DEBUG] ${label} の計算開始 (${format(weekStart, 'yyyy-MM-dd')} ～ ${format(weekEnd, 'yyyy-MM-dd')})`);
  
  const startedMembers: StartedMemberDetail[] = [];
  const endedMembers: EndedMemberDetail[] = [];
  const otherItems: OtherStatusDetail[] = [];
  
  let totalWorkers = 0;
  let newStarted = 0;
  let switching = 0;
  let projectEnded = 0;
  let contractEnded = 0;
  let counselingCount = 0;

  members.forEach(member => {
    // その週時点で稼働しているかどうか
    const isWorkingThisWeek = isWorkingAtDate(member, weekEnd);
    if (isWorkingThisWeek) {
      totalWorkers++;
      console.log(`[DEBUG] 稼働中: ${member.name} (開始: ${member.lastWorkStartDate ? format(member.lastWorkStartDate, 'yyyy-MM-dd') : 'N/A'})`);
    }

    // その週に稼働開始した人（lastWorkStartDateを使用）
    if (member.lastWorkStartDate && 
        isWithinInterval(member.lastWorkStartDate, { start: weekStart, end: weekEnd })) {
      
      // 切替完了人数の判定: lastWorkEndDateがあり、かつ開始日より前の場合
      if (member.lastWorkEndDate && isBefore(member.lastWorkEndDate, member.lastWorkStartDate)) {
        switching++;
        console.log(`[DEBUG] 切替完了: ${member.name} (開始: ${format(member.lastWorkStartDate, 'yyyy-MM-dd')}, 前終了: ${format(member.lastWorkEndDate, 'yyyy-MM-dd')})`);
        startedMembers.push({
          type: 'switching',
          memberName: member.name,
          previousProject: '前案件'
        });
      } else {
        // 新規開始人数
        newStarted++;
        console.log(`[DEBUG] 新規開始: ${member.name} (${format(member.lastWorkStartDate, 'yyyy-MM-dd')}) - 終了日: なし`);
        startedMembers.push({
          type: 'new',
          memberName: member.name
        });
      }
    }

    // その週に案件終了した人
    if (member.lastWorkEndDate &&
        isWithinInterval(member.lastWorkEndDate, { start: weekStart, end: weekEnd })) {
      
      // 案件終了の判定（ステータスに関係なく、終了日がある場合は案件終了として扱う）
      // ただし、契約終了日と同じ場合は契約終了として扱う
      if (!member.contractEndDate || 
          (member.contractEndDate && member.lastWorkEndDate.getTime() !== member.contractEndDate.getTime())) {
        projectEnded++;
        console.log(`[DEBUG] 案件終了: ${member.name} (${format(member.lastWorkEndDate, 'yyyy-MM-dd')}) - ステータス: ${member.status}`);
        endedMembers.push({
          type: 'project',
          memberName: member.name,
          reason: '案件終了'
        });
      }
    }

    // その週に契約終了した人
    if (member.contractEndDate &&
        isWithinInterval(member.contractEndDate, { start: weekStart, end: weekEnd })) {
      
      contractEnded++;
      console.log(`[DEBUG] 契約終了: ${member.name} (${format(member.contractEndDate, 'yyyy-MM-dd')}) - ステータス: ${member.status}`);
      endedMembers.push({
        type: 'contract',
        memberName: member.name,
        reason: '契約終了'
      });
    }

    // その週にカウンセリングを実施した人
    if (member.firstCounselingDate &&
        isWithinInterval(member.firstCounselingDate, { start: weekStart, end: weekEnd })) {
      counselingCount++;
      console.log(`[DEBUG] カウンセリング実施: ${member.name} (${format(member.firstCounselingDate, 'yyyy-MM-dd')})`);
    }
  });

  // その他項目（カウンセリングなど）
  if (counselingCount > 0) {
    otherItems.push({
      type: 'counseling_start',
      count: counselingCount,
      members: [] // 詳細は必要に応じて追加
    });
  }

  const totalStarted = newStarted + switching;
  const totalEnded = projectEnded + contractEnded;

  console.log(`[DEBUG] ${label} 結果: 総稼働者数=${totalWorkers}, 新規開始=${newStarted}, 切替完了=${switching}, 案件終了=${projectEnded}, 契約終了=${contractEnded}, カウンセリング=${counselingCount}`);

  return {
    weekLabel: label,
    weekNumber: weekNumber,
    totalWorkers,
    totalStarted,
    newStarted,
    switching,
    totalEnded,
    projectEnded,
    contractEnded,
    startedMembers,
    endedMembers,
    otherItems
  };
}

/**
 * 指定日時点でメンバーが稼働中かどうかを判定
 * 総稼働者数の定義: 最新業務開始日が対象週終了日以前であり、かつ（最新業務終了日が空白、または、終了日が開始日より前、または対象週終了日以降）であるメンバー
 */
export function isWorkingAtDate(member: Member, date: Date): boolean {
  const startDate = member.lastWorkStartDate;
  const endDate = member.lastWorkEndDate;
  
  // 開始日がない、または指定日より後なら稼働していない
  if (!startDate || startDate > date) {
    return false;
  }
  
  // 終了日がない場合は稼働中
  if (!endDate) {
    return true;
  }
  
  // 終了日が開始日より前の場合は再稼働パターン（終了後に再開始）として稼働中
  if (endDate < startDate) {
    return true;
  }
  
  // 終了日が指定日以降なら稼働中
  return endDate >= date;
} 