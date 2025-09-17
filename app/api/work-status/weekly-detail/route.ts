export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Member } from '@/lib/types/member';
import { MemberStatus, JobCategory } from '@/lib/types/enums';
import { WeeklyWorkStatusDetail, WeeklyDetail, WeeklyDetailOptimized, WeeklyWorkStatusDetailOptimized, StartedMemberDetail, EndedMemberDetail, MemberDetailWithDates } from '@/lib/types/work_status_report';
import { startOfWeek, endOfWeek, format, addDays, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getWeekNumberFromDate, getWeekNumberFromWeekStart, getWeeksAssignedToMonth } from '@/lib/date';

/**
 * 月内の週番号を計算（土曜日開始）- 月の1日を含む週を第1週とする
 */
function getWeekOfMonth(date: Date): number {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  
  // 月の1日を含む週の土曜日を見つける
  let daysToFirstSaturday: number;
  if (firstDayOfWeek === 6) {
    daysToFirstSaturday = 0;
  } else {
    daysToFirstSaturday = -(firstDayOfWeek + 1);
  }
  
  const firstWeekStart = new Date(firstDayOfMonth);
  firstWeekStart.setDate(firstDayOfMonth.getDate() + daysToFirstSaturday);
  
  // 対象日がどの週に属するかを計算
  const diffInDays = Math.floor((date.getTime() - firstWeekStart.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffInDays / 7) + 1;
  
  return Math.max(1, Math.min(weekNumber, 5)); // 1-5週の範囲
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2025');
    const month = parseInt(searchParams.get('month') || '1');
    const week = parseInt(searchParams.get('week') || '1');

    const adminDb = getAdminDb();

    // 全メンバーデータを取得
    const membersSnapshot = await adminDb.collection('members').get();
    const members: Member[] = membersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        applicationDate: data.applicationDate?.toDate(),
        hireDate: data.hireDate?.toDate(),
        firstWorkStartDate: data.firstWorkStartDate?.toDate(),
        lastWorkStartDate: data.lastWorkStartDate?.toDate(),
        firstCounselingDate: data.firstCounselingDate?.toDate(),
        lastWorkEndDate: data.lastWorkEndDate?.toDate(),
        contractEndDate: data.contractEndDate?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        lastSyncedAt: data.lastSyncedAt?.toDate(),
      } as Member;
    });

    console.log(`[DEBUG] 取得したメンバー数: ${members.length}`);
    
    // 最近の稼働開始者を確認
    const recentStarters = members.filter(m => 
      m.lastWorkStartDate && m.lastWorkStartDate >= new Date('2025-05-01')
    );
    console.log(`[DEBUG] 2025年5月以降の稼働開始者: ${recentStarters.length}名`);
    
    // 終了日を持つメンバーを確認
    const withEndDate = members.filter(m => m.lastWorkEndDate);
    console.log(`[DEBUG] 終了日を持つメンバー: ${withEndDate.length}名`);
    
    // 契約終了日を持つメンバーを確認
    const withContractEnd = members.filter(m => m.contractEndDate);
    console.log(`[DEBUG] 契約終了日を持つメンバー: ${withContractEnd.length}名`);

    // 選択された月内の週を基準に4週間のデータを生成
    // weekパラメータは月内の週番号（1-5）として扱う
    console.log(`[DEBUG] 受信パラメータ: year=${year}, month=${month}, week=${week} (月内週番号)`);
    
    // 新定義（多数決）に基づき、指定月に「属する」週の一覧から選択
    const weeksAssigned = getWeeksAssignedToMonth(year, month);
    const targetIndex = Math.max(0, Math.min(week - 1, weeksAssigned.length - 1));
    const targetSaturday = new Date(weeksAssigned[targetIndex]?.start || new Date(year, month - 1, 1));
    
    console.log(`[DEBUG] 計算された基準土曜日(多数決): ${targetSaturday.toISOString().split('T')[0]} (${month}月${week}週目)`);

    // 4週間のデータを生成（月またぎの週をスキップ）
    const weekDetails: WeeklyDetailOptimized[] = [];
    
    // 選択週を基準に、前後2週間ずつを取得（月またぎの週はスキップ）
    const weekOffsets = [-2, -1, 0, 1, 2]; // 前2週、前1週、選択週、後1週、後2週
    let validWeekCount = 0;
    const maxWeeks = 4; // 最大4週間表示
    
    // 累積的な計算のための変数（最初の週は直接計算で基準値を設定）
    let cumulativeTotalWorkers = 0;
    
    for (let i = 0; i < weekOffsets.length && validWeekCount < maxWeeks; i++) {
      const offset = weekOffsets[i];
      const weekSaturday = new Date(targetSaturday);
      weekSaturday.setDate(targetSaturday.getDate() + offset * 7);
      
      const weekStart = new Date(weekSaturday); // 土曜日開始
      const weekEnd = new Date(weekSaturday);
      weekEnd.setDate(weekEnd.getDate() + 6); // 金曜日終了
      
      // 週ラベルを生成（多数決で属する月・週番号）
      const weekStartWeekInfo = getWeekNumberFromWeekStart(weekStart);
      const weekLabel = `${weekStartWeekInfo.month}月${weekStartWeekInfo.weekInMonth}W`;
      
      const isPrediction = offset > 0; // 選択週より後の週は予定
      const isTarget = offset === 0; // 選択週
      
      console.log(`[DEBUG] 週 ${i} (offset: ${offset}): ${weekLabel}${isPrediction ? '(予定)' : ''}, 開始: ${weekStart.toISOString().split('T')[0]}, 終了: ${weekEnd.toISOString().split('T')[0]}`);
      
      // その週の稼働状況を計算（メンバー詳細を含む最適化版）
      const weekDetail = calculateWeeklyStatusWithDetails(members, weekStart, weekEnd, weekLabel + (isPrediction ? '(予定)' : ''), validWeekCount + 1, cumulativeTotalWorkers);
      weekDetails.push(weekDetail);
      
  // 累積計算の更新（SOWに従った正しい計算）
  if (validWeekCount === 0) {
    // 最初の週は直接計算で基準値を設定
    const directTotalWorkers = members.filter(member => {
      const startDate = member.lastWorkStartDate;
      const endDate = member.lastWorkEndDate;
      const contractEndDate = member.contractEndDate;
      
      if (!startDate || startDate > weekEnd) return false;
      if (contractEndDate && contractEndDate <= weekEnd) return false;
      if (!endDate) return true;
      if (endDate < startDate) return true;
      if (endDate <= weekEnd) return false;
      return endDate > weekEnd;
    }).length;
    cumulativeTotalWorkers = directTotalWorkers;
  } else {
    // 2週目以降は累積計算（直接計算と一致するように修正）
    const totalStarted = weekDetail.totalStarted;
    const totalEnded = weekDetail.totalEnded;
    cumulativeTotalWorkers = cumulativeTotalWorkers + totalStarted - totalEnded;
  }
      
      validWeekCount++;
    }

    const result: WeeklyWorkStatusDetailOptimized = {
      year,
      month,
      weekDetails
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('週次稼働状況詳細データ取得エラー:', error);
    return NextResponse.json(
      { error: '週次稼働状況詳細データの取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * 日付をYYYY-MM-DD形式でフォーマット
 */
function formatDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  try {
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn('日付フォーマットエラー:', error);
    return null;
  }
}

/**
 * メンバー詳細を含む最適化された週次稼働状況を計算
 */
function calculateWeeklyStatusWithDetails(
  members: Member[],
  weekStart: Date,
  weekEnd: Date,
  label: string,
  weekNumber: number,
  previousWeekTotalWorkers: number = 0
): WeeklyDetailOptimized {
  // 重複を防ぐため、優先順位付きでメンバー詳細を生成
  const processedMemberIds = new Set<string>();
  
  // 1. 契約終了（最優先）
  const contractEnded = getContractEndedDetails(members, weekStart, weekEnd);
  contractEnded.forEach(m => processedMemberIds.add(m.id));
  
  // 2. 案件終了（2番目）
  const projectEnded = getProjectEndedDetails(members, weekStart, weekEnd)
    .filter(m => !processedMemberIds.has(m.id));
  projectEnded.forEach(m => processedMemberIds.add(m.id));
  
  // 3. 切替完了（3番目）- 終了履歴があり、新規開始する場合
  // 西村龍輝さんのように両方の条件を満たす場合は両方に表示
  const switching = getSwitchingDetails(members, weekStart, weekEnd);
  // 案件終了と切替完了の両方の条件を満たすメンバーを特定
  const dualConditionMembers = switching.filter(m => 
    projectEnded.some(p => p.id === m.id)
  );
  
  // 切替完了に追加（重複チェックをスキップ）
  switching.forEach(m => processedMemberIds.add(m.id));
  
  // デバッグ: 西村龍輝さんの両方条件チェック
  const nishimuraCheck = members.find(m => m.name === '西村龍輝');
  if (nishimuraCheck) {
    const isProjectEnded = projectEnded.some(p => p.id === nishimuraCheck.id);
    const isSwitching = switching.some(s => s.id === nishimuraCheck.id);
    console.log(`🔍 [DEBUG] 西村龍輝さんの条件チェック:`);
    console.log(`  - 案件終了条件: ${isProjectEnded}`);
    console.log(`  - 切替完了条件: ${isSwitching}`);
    console.log(`  - 両方の条件: ${isProjectEnded && isSwitching}`);
  }
  
  // 4. 新規開始（4番目）- 切替完了以外の新規開始
  const newStarted = getNewStartedDetails(members, weekStart, weekEnd)
    .filter(m => !processedMemberIds.has(m.id));
  newStarted.forEach(m => processedMemberIds.add(m.id));
  
  // 5. カウンセリング開始（独立）- 他の指標と重複可能
  const counselingStarted = getCounselingStartedDetails(members, weekStart, weekEnd);
  
  console.log(`🔧 [DEBUG] ${label} 重複チェック結果:`);
  console.log(`  - 契約終了: ${contractEnded.length}人`);
  console.log(`  - 案件終了: ${projectEnded.length}人`);
  console.log(`  - 切替完了: ${switching.length}人`);
  console.log(`  - 新規開始: ${newStarted.length}人`);
  console.log(`  - カウンセリング開始: ${counselingStarted.length}人`);
  console.log(`  - 処理済みメンバーID: ${Array.from(processedMemberIds).join(', ')}`);
  
  // 総稼働者数を計算（直接計算と累積計算の両方を実装）
  const totalStarted = newStarted.length + switching.length;
  const totalEnded = projectEnded.length + contractEnded.length;
  
  // 1. 直接計算（週終了日時点での稼働者数）
  const directTotalWorkers = members.filter(member => {
    const startDate = member.lastWorkStartDate;
    const endDate = member.lastWorkEndDate;
    const contractEndDate = member.contractEndDate;
    
    // 開始がない、または週末日より後は非稼働
    if (!startDate || startDate > weekEnd) return false;
    // 契約終了で締まっていれば非稼働
    if (contractEndDate && contractEndDate <= weekEnd) return false;
    // 終了が未設定なら稼働
    if (!endDate) return true;
    // 再稼働パターンは稼働
    if (endDate < startDate) return true;
    // 週末日以前に終了していれば非稼働
    if (endDate <= weekEnd) return false;
    // 週末日より後に終了 → 稼働
    return true;
  }).length;
  
  // デバッグ: 直接計算の詳細ログ
  console.log(`🔍 [DEBUG] ${label} 直接計算詳細:`);
  const activeMembers = members.filter(member => {
    const startDate = member.lastWorkStartDate;
    const endDate = member.lastWorkEndDate;
    const contractEndDate = member.contractEndDate;
    
    if (!startDate || startDate > weekEnd) return false;
    if (contractEndDate && contractEndDate <= weekEnd) return false;
    if (!endDate) return true;
    if (endDate < startDate) return true;
    if (endDate <= weekEnd) return false;
    return true;
  });
  
  console.log(`  - 稼働中メンバー数: ${activeMembers.length}人`);
  console.log(`  - 再稼働パターン: ${activeMembers.filter(m => m.lastWorkStartDate && m.lastWorkEndDate && m.lastWorkEndDate < m.lastWorkStartDate).length}人`);
  console.log(`  - 終了日なし: ${activeMembers.filter(m => !m.lastWorkEndDate).length}人`);
  console.log(`  - 終了日が週終了日以降: ${activeMembers.filter(m => m.lastWorkEndDate && m.lastWorkEndDate >= weekEnd).length}人`);
  
  // 西村龍輝さんの具体的なケースを確認
  const nishimuraDetail = nishimuraCheck || members.find(m => m.name === '西村龍輝');
  if (nishimuraDetail) {
    console.log(`🔍 [DEBUG] 西村龍輝さんの詳細:`);
    console.log(`  - 開始日: ${nishimuraDetail.lastWorkStartDate?.toISOString().split('T')[0]}`);
    console.log(`  - 終了日: ${nishimuraDetail.lastWorkEndDate?.toISOString().split('T')[0]}`);
    console.log(`  - 契約終了日: ${nishimuraDetail.contractEndDate?.toISOString().split('T')[0]}`);
    console.log(`  - 週終了日: ${weekEnd.toISOString().split('T')[0]}`);
    console.log(`  - 再稼働パターン判定: ${Boolean(nishimuraDetail.lastWorkEndDate && nishimuraDetail.lastWorkStartDate && nishimuraDetail.lastWorkEndDate < nishimuraDetail.lastWorkStartDate)}`);
    console.log(`  - 稼働中判定: ${activeMembers.some(m => m.id === nishimuraDetail.id)}`);
  }
  
  // 2. 累積計算（SOW対応）: 前週(直接)稼働集合をベースに有効開始/有効終了で更新
  const prevWeekEnd = new Date(weekEnd);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
  const isActiveAt = (member: Member, refEnd: Date): boolean => {
    const startDate = member.lastWorkStartDate;
    const endDate = member.lastWorkEndDate;
    const contractEndDate = member.contractEndDate;
    // 契約終了で締まっていれば非稼働
    if (contractEndDate && contractEndDate <= refEnd) return false;
    // 開始が未設定なら非稼働
    if (!startDate) return false;
    // 再稼働パターン: 直前案件の終了(end)がrefEndより後なら、その時点は稼働中
    if (endDate && endDate < startDate) {
      return endDate > refEnd;
    }
    // 通常パターン
    if (startDate > refEnd) return false;
    if (!endDate) return true;
    if (endDate <= refEnd) return false;
    return true;
  };
  const prevActiveMembers = members.filter(m => isActiveAt(m, prevWeekEnd));
  const prevActiveIds = new Set(prevActiveMembers.map(m => m.id));
  const startedIdsThisWeek = new Set<string>([
    ...newStarted.map(m => m.id),
    ...switching.map(m => m.id)
  ]);
  const endedIdsThisWeek = new Set<string>([
    ...projectEnded.map(m => m.id),
    ...contractEnded.map(m => m.id)
  ]);
  // 当週末時点で非稼働になっていることを追加条件にし、同週内の切替(再稼働)を有効終了から除外
  const effectiveEndedMembers = members.filter(m =>
    endedIdsThisWeek.has(m.id) &&
    prevActiveIds.has(m.id)
  );
  // 切替同週(end<start 両方当週)は有効開始にも含める（ネット0に収束）
  const effectiveStartedMembers = members.filter(m =>
    startedIdsThisWeek.has(m.id) && (
      !prevActiveIds.has(m.id) || endedIdsThisWeek.has(m.id)
    )
  );
  const cumulativeTotalWorkers = prevActiveIds.size + effectiveStartedMembers.length - effectiveEndedMembers.length;

  // 有効増減をレスポンスに含めるためのメタ
  const netChangeEffective = effectiveStartedMembers.length - effectiveEndedMembers.length;
  
  // デバッグログ
  console.log(`🔧 [DEBUG] ${label} 総稼働者数計算比較:`);
  console.log(`  - 直接計算: ${directTotalWorkers}人`);
  console.log(`  - 累積計算(有効): ${cumulativeTotalWorkers}人 (前週直接: ${prevActiveIds.size} + 有効開始: ${effectiveStartedMembers.length} - 有効終了: ${effectiveEndedMembers.length})`);
  console.log(`  - 差分: ${directTotalWorkers - cumulativeTotalWorkers}人`);
  
  // 差分が発生しているメンバーを具体的に特定
  if (directTotalWorkers !== cumulativeTotalWorkers) {
    console.log(`🔍 [DEBUG] ${label} 差分分析:`);
    
    // 直接計算で稼働中と判定されたメンバー
    const directActiveMembers = members.filter(member => {
      const startDate = member.lastWorkStartDate;
      const endDate = member.lastWorkEndDate;
      const contractEndDate = member.contractEndDate;
      
      if (!startDate || startDate > weekEnd) return false;
      if (contractEndDate && contractEndDate < weekEnd) return false;
      if (!endDate) return true;
      if (endDate < startDate) return true;
      if (endDate < weekEnd) return false;
      return endDate >= weekEnd;
    });
    
    // 累積計算で想定される稼働中メンバー数
    const expectedActiveCount = cumulativeTotalWorkers;
    const actualActiveCount = directActiveMembers.length;
    
    console.log(`  - 直接計算で稼働中: ${actualActiveCount}人`);
    console.log(`  - 累積計算で想定: ${expectedActiveCount}人`);
    console.log(`  - 実際の差分: ${actualActiveCount - expectedActiveCount}人`);
    
    // 再稼働パターンのメンバーを詳細表示
    const reactivationMembers = directActiveMembers.filter(m => 
      m.lastWorkStartDate && m.lastWorkEndDate && m.lastWorkEndDate < m.lastWorkStartDate
    );
    console.log(`  - 再稼働パターンメンバー: ${reactivationMembers.length}人`);
    reactivationMembers.forEach(m => {
      console.log(`    * ${m.name}: 開始日=${m.lastWorkStartDate?.toISOString().split('T')[0]}, 終了日=${m.lastWorkEndDate?.toISOString().split('T')[0]}`);
    });

    // 差分の主因になりやすい「週終了日と同日終了（境界）」の特定
    const directActiveIds = new Set(directActiveMembers.map(m => m.id));
    const weekEndStr = formatDate(weekEnd);

    const projectEndedBoundaryActive = projectEnded.filter(m => 
      m.lastWorkEndDate === weekEndStr && directActiveIds.has(m.id)
    );
    const contractEndedBoundaryActive = contractEnded.filter(m => 
      m.contractEndDate === weekEndStr && directActiveIds.has(m.id)
    );

    console.log(`  - 週終了日当日終了(案件)かつ直接計算で稼働中: ${projectEndedBoundaryActive.length}人`);
    projectEndedBoundaryActive.forEach(m => {
      console.log(`    * ${m.name} (案件終了: ${m.lastWorkEndDate})`);
    });
    console.log(`  - 週終了日当日終了(契約)かつ直接計算で稼働中: ${contractEndedBoundaryActive.length}人`);
    contractEndedBoundaryActive.forEach(m => {
      console.log(`    * ${m.name} (契約終了: ${m.contractEndDate})`);
    });

    // 当週に終了として数えているが直接計算では非稼働のケース（理論上は差分を縮める要因）
    const endedThisWeekIds = new Set([
      ...projectEnded.map(m => m.id),
      ...contractEnded.map(m => m.id)
    ]);
    const directInactiveButEndedThisWeek = members.filter(member => {
      if (!endedThisWeekIds.has(member.id)) return false;
      const startDate = member.lastWorkStartDate;
      const endDate = member.lastWorkEndDate;
      const contractEndDate = member.contractEndDate;
      // 直接計算における非稼働条件
      if (!startDate || startDate > weekEnd) return true;
      if (contractEndDate && contractEndDate < weekEnd) return true;
      if (!endDate) return false;
      if (endDate < startDate) return false;
      if (endDate < weekEnd) return true;
      return false; // endDate >= weekEnd の場合は直接では稼働
    });
    if (directInactiveButEndedThisWeek.length > 0) {
      console.log(`  - 当週に終了カウントかつ直接計算では非稼働: ${directInactiveButEndedThisWeek.length}人`);
      directInactiveButEndedThisWeek.forEach(m => {
        console.log(`    * ${m.name}: 開始=${m.lastWorkStartDate ? formatDate(m.lastWorkStartDate) : 'なし'}, 終了=${m.lastWorkEndDate ? formatDate(m.lastWorkEndDate) : 'なし'}, 契約終了=${m.contractEndDate ? formatDate(m.contractEndDate) : 'なし'}`);
      });
    }
  }
  
  // 表示は直接計算（スナップショット）。累積は説明用として別フィールドで返す
  const calculatedTotalWorkers = directTotalWorkers;
  
  const memberDetails = {
    newStarted,
    switching,
    projectEnded,
    contractEnded,
    counselingStarted
  };
  
  // 最適化されたデータ構造で返す（数値も正しく計算）
  return {
    weekLabel: label,
    weekNumber,
    totalWorkers: calculatedTotalWorkers,
    totalStarted: totalStarted,
    newStarted: newStarted.length,
    switching: switching.length,
    totalEnded: totalEnded,
    projectEnded: projectEnded.length,
    contractEnded: contractEnded.length,
    counselingStarted: counselingStarted.length,
    otherLeft: 0, // 現在未実装
    startedMembers: [], // 最適化版では詳細はmemberDetailsに含まれる
    endedMembers: [], // 最適化版では詳細はmemberDetailsに含まれる
    otherItems: [], // 最適化版では詳細はmemberDetailsに含まれる
    memberDetails,
    // 説明用の有効開始/有効終了/純増減（UI側参考）
    effectiveStarted: effectiveStartedMembers.length,
    effectiveEnded: effectiveEndedMembers.length,
    netChangeEffective: netChangeEffective
  };
}

/**
 * 新規開始メンバーの詳細を取得
 */
function getNewStartedDetails(members: Member[], weekStart: Date, weekEnd: Date): MemberDetailWithDates[] {
  return members
    .filter(member => {
      if (!member.lastWorkStartDate) return false;
      const startDate = new Date(member.lastWorkStartDate);
      if (!(startDate >= weekStart && startDate <= weekEnd)) return false;
      
      // 新規開始の判定: 終了日が存在しない場合のみ新規開始
      // 切替完了の条件（lastWorkEndDate < lastWorkStartDate）を満たす場合は除外
      if (!member.lastWorkEndDate) return true; // 終了日がない場合は新規開始
      
      const endDate = new Date(member.lastWorkEndDate);
      // 終了日が開始日より前の場合は切替完了なので新規開始ではない
      return false; // 終了日が存在する場合は新規開始ではない（切替完了に分類される）
    })
    .map(member => ({
      id: member.id,
      name: member.name,
      lastWorkStartDate: formatDate(member.lastWorkStartDate),
      lastWorkEndDate: formatDate(member.lastWorkEndDate),
      contractEndDate: formatDate(member.contractEndDate),
      firstCounselingDate: formatDate(member.firstCounselingDate),
      status: member.status,
      projectName: '新規開始'
    }));
}

/**
 * 切替完了メンバーの詳細を取得
 */
function getSwitchingDetails(members: Member[], weekStart: Date, weekEnd: Date): MemberDetailWithDates[] {
  return members
    .filter(member => {
      if (!member.lastWorkStartDate || !member.lastWorkEndDate) return false;
      const startDate = new Date(member.lastWorkStartDate);
      const endDate = new Date(member.lastWorkEndDate);
      
      // 切替完了の判定: lastWorkEndDateが存在し、それより後に週範囲内でlastWorkStartDate
      return endDate < startDate && startDate >= weekStart && startDate <= weekEnd;
    })
    .map(member => ({
      id: member.id,
      name: member.name,
      lastWorkStartDate: formatDate(member.lastWorkStartDate),
      lastWorkEndDate: formatDate(member.lastWorkEndDate),
      contractEndDate: formatDate(member.contractEndDate),
      firstCounselingDate: formatDate(member.firstCounselingDate),
      status: member.status,
      projectName: '切替完了'
    }));
}

/**
 * 案件終了メンバーの詳細を取得
 */
function getProjectEndedDetails(members: Member[], weekStart: Date, weekEnd: Date): MemberDetailWithDates[] {
  return members
    .filter(member => {
      if (!member.lastWorkEndDate) return false;
      const endDate = new Date(member.lastWorkEndDate);
      return endDate >= weekStart && endDate <= weekEnd;
    })
    .map(member => ({
      id: member.id,
      name: member.name,
      lastWorkStartDate: formatDate(member.lastWorkStartDate),
      lastWorkEndDate: formatDate(member.lastWorkEndDate),
      contractEndDate: formatDate(member.contractEndDate),
      firstCounselingDate: formatDate(member.firstCounselingDate),
      status: member.status,
      reason: '案件終了'
    }));
}

/**
 * 契約終了メンバーの詳細を取得
 */
function getContractEndedDetails(members: Member[], weekStart: Date, weekEnd: Date): MemberDetailWithDates[] {
  return members
    .filter(member => {
      if (!member.contractEndDate) return false;
      const endDate = new Date(member.contractEndDate);
      return endDate >= weekStart && endDate <= weekEnd;
    })
    .map(member => ({
      id: member.id,
      name: member.name,
      lastWorkStartDate: formatDate(member.lastWorkStartDate),
      lastWorkEndDate: formatDate(member.lastWorkEndDate),
      contractEndDate: formatDate(member.contractEndDate),
      firstCounselingDate: formatDate(member.firstCounselingDate),
      status: member.status,
      reason: '契約終了'
    }));
}

/**
 * カウンセリング開始メンバーの詳細を取得
 */
function getCounselingStartedDetails(members: Member[], weekStart: Date, weekEnd: Date): MemberDetailWithDates[] {
  return members
    .filter(member => {
      if (!member.firstCounselingDate) return false;
      const counselingDate = new Date(member.firstCounselingDate);
      return counselingDate >= weekStart && counselingDate <= weekEnd;
    })
    .map(member => ({
      id: member.id,
      name: member.name,
      lastWorkStartDate: formatDate(member.lastWorkStartDate),
      lastWorkEndDate: formatDate(member.lastWorkEndDate),
      contractEndDate: formatDate(member.contractEndDate),
      firstCounselingDate: formatDate(member.firstCounselingDate),
      status: member.status,
      reason: 'カウンセリング開始'
    }));
}

 