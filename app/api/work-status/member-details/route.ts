export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Member } from '@/lib/types/member';
import { MemberStatus, JobCategory } from '@/lib/types/enums';

interface MemberDetail {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  status: string;
  jobCategory?: JobCategory;
  reason?: string;
  workHistory?: {
    projectName?: string;
    startDate: string;
    endDate?: string;
  }[];
}

interface MemberDetailsResponse {
  totalMembers: number;
  newStarters: MemberDetail[];
  switchers: MemberDetail[];
  terminators: MemberDetail[];
  contractEnders: MemberDetail[];
  statusBreakdown: {
    working: MemberDetail[];
    learningStarted: MemberDetail[];
    recruiting: MemberDetail[];
    training: MemberDetail[];
    projectReleased: MemberDetail[];
    workEnded: MemberDetail[];
    contractEnded: MemberDetail[];
    inactive: MemberDetail[];
  };
  lastUpdated: string;
  weekInfo: {
    year: number;
    month: number;
    week: number;
    weekStart: string;
    weekEnd: string;
  };
}

/**
 * 指定週のメンバー詳細情報を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2025');
    const month = parseInt(searchParams.get('month') || '1');
    const week = parseInt(searchParams.get('week') || '1');
    const type = searchParams.get('type') || '';

    const adminDb = getAdminDb();

    // 週次詳細データを取得して、該当するメンバーのIDを特定
    const weekDetailResponse = await fetch(
      `${request.nextUrl.origin}/api/work-status/weekly-detail?year=${year}&month=${month}&week=${week}`
    );
    
    if (!weekDetailResponse.ok) {
      throw new Error('週次詳細データの取得に失敗しました');
    }

    const weekDetailData = await weekDetailResponse.json();
    
    // クリックされた週に対応するデータを特定
    // year, month, weekから週ラベルを生成
    const weekLabel = `${month}月${week}W`;
    const selectedWeekDetail = weekDetailData.weekDetails.find((detail: any) => 
      detail.weekLabel === weekLabel
    );

    if (!selectedWeekDetail) {
      console.warn(`週詳細データが見つかりません: ${weekLabel}`);
      return NextResponse.json({ success: true, data: [] });
    }

    // タイプに応じてメンバー名のリストを取得
    let memberNames: string[] = [];
    
    switch (type) {
      case 'newStarted':
        memberNames = selectedWeekDetail.startedMembers
          .filter((m: any) => m.type === 'new')
          .map((m: any) => m.memberName);
        break;
      case 'switching':
        memberNames = selectedWeekDetail.startedMembers
          .filter((m: any) => m.type === 'switching')
          .map((m: any) => m.memberName);
        break;
      case 'projectEnded':
        memberNames = selectedWeekDetail.endedMembers
          .filter((m: any) => m.type === 'project')
          .map((m: any) => m.memberName);
        break;
      case 'contractEnded':
        memberNames = selectedWeekDetail.endedMembers
          .filter((m: any) => m.type === 'contract')
          .map((m: any) => m.memberName);
        break;
      case 'counselingStarted':
        memberNames = selectedWeekDetail.otherItems
          ?.filter((item: any) => item.type === 'counseling_start')
          ?.flatMap((item: any) => item.members || []) || [];
        break;
      default:
        return NextResponse.json({ success: true, data: [] });
    }

    // メンバー名からFirestoreのメンバー情報を取得
    const memberDetails = [];
    
    for (const name of memberNames) {
      const memberSnapshot = await adminDb
        .collection('members')
        .where('name', '==', name)
        .limit(1)
        .get();
      
      if (!memberSnapshot.empty) {
        const memberDoc = memberSnapshot.docs[0];
        const rawMemberData = memberDoc.data();
        const memberData = convertFromFirestoreData({ id: memberDoc.id, ...rawMemberData });
        
        // 日付の安全な変換関数
        const safeFormatDate = (dateValue: any): string | null => {
          if (!dateValue) return null;
          try {
            let date: Date;
            
            // Firestoreのタイムスタンプオブジェクトの場合
            if (dateValue.toDate && typeof dateValue.toDate === 'function') {
              date = dateValue.toDate();
            }
            // 既にDateオブジェクトの場合
            else if (dateValue instanceof Date) {
              date = dateValue;
            }
            // 文字列の場合
            else if (typeof dateValue === 'string') {
              date = new Date(dateValue);
            }
            // 数値（Unix timestamp）の場合
            else if (typeof dateValue === 'number') {
              date = new Date(dateValue);
            }
            // その他の形式
            else {
              date = new Date(dateValue);
            }
            
            if (isNaN(date.getTime())) return null;
            return date.toISOString().split('T')[0];
          } catch (error) {
            console.warn(`日付変換エラー: ${dateValue}`, error);
            return null;
          }
        };

        memberDetails.push({
          id: memberDoc.id,
          name: memberData.name,
          lastWorkStartDate: safeFormatDate(memberData.lastWorkStartDate),
          lastWorkEndDate: safeFormatDate(memberData.lastWorkEndDate),
          contractEndDate: safeFormatDate(memberData.contractEndDate),
          firstCounselingDate: safeFormatDate(memberData.firstCounselingDate),
          status: memberData.status,
          projectName: memberData.currentProject || '',
          reason: ''
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: memberDetails 
    });

  } catch (error) {
    console.error('メンバー詳細データ取得エラー:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'メンバー詳細データの取得中にエラーが発生しました' 
      },
      { status: 500 }
    );
  }
}

/**
 * MemberをMemberDetailに変換
 */
function convertToMemberDetail(member: Member): MemberDetail {
  return {
    id: member.id,
    name: member.name,
    startDate: member.firstWorkStartDate?.toISOString().split('T')[0] || member.lastWorkStartDate?.toISOString().split('T')[0] || '',
    endDate: member.lastWorkEndDate?.toISOString().split('T')[0] || member.contractEndDate?.toISOString().split('T')[0],
    status: member.status,
    jobCategory: member.jobCategory,
    reason: member.statusUpdatedReason,
    workHistory: member.workHistory?.map(wh => ({
      projectName: wh.projectName,
      startDate: wh.startDate instanceof Date ? wh.startDate.toISOString().split('T')[0] : 
                 typeof wh.startDate === 'string' ? wh.startDate : '',
      endDate: wh.endDate instanceof Date ? wh.endDate.toISOString().split('T')[0] : 
               typeof wh.endDate === 'string' ? wh.endDate : undefined
    }))
  };
}

/**
 * Firestoreデータを Member 型に変換
 */
function convertFromFirestoreData(data: any): Member {
  return {
    id: data.id,
    notionId: data.notionId || data.id,
    name: data.name || '',
    normalizedName: data.normalizedName || '',
    aliases: data.aliases || [],
    email: data.email,
    phone: data.phone,
    applicationDate: data.applicationDate?.toDate ? data.applicationDate.toDate() : data.applicationDate,
    hireDate: data.hireDate?.toDate ? data.hireDate.toDate() : data.hireDate,
    firstCounselingDate: data.firstCounselingDate?.toDate ? data.firstCounselingDate.toDate() : data.firstCounselingDate,
    nearestStation: data.nearestStation,
    desiredShift: data.desiredShift,
    skills: data.skills || [],
    learningPrograms: data.learningPrograms || [],
    status: data.status || 'inactive',
    currentProject: data.currentProject,
    firstWorkStartDate: data.firstWorkStartDate?.toDate ? data.firstWorkStartDate.toDate() : data.firstWorkStartDate,
    lastWorkStartDate: data.lastWorkStartDate?.toDate ? data.lastWorkStartDate.toDate() : data.lastWorkStartDate,
    lastWorkEndDate: data.lastWorkEndDate?.toDate ? data.lastWorkEndDate.toDate() : data.lastWorkEndDate,
    contractEndDate: data.contractEndDate?.toDate ? data.contractEndDate.toDate() : data.contractEndDate,
    jobCategory: data.jobCategory,
    desiredJobCategories: data.desiredJobCategories || [],
    workHistory: data.workHistory || [],
    statusUpdatedReason: data.statusUpdatedReason,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
    lastSyncedAt: data.lastSyncedAt?.toDate ? data.lastSyncedAt.toDate() : undefined,
  };
}

/**
 * 指定週に新規開始したかを判定
 */
function isNewStarterInWeek(member: Member, weekStart: Date, weekEnd: Date): boolean {
  if (!member.firstWorkStartDate && !member.lastWorkStartDate) return false;
  
  const startDate = member.firstWorkStartDate || member.lastWorkStartDate;
  if (!startDate) return false;
  
  return startDate >= weekStart && startDate <= weekEnd;
}

/**
 * 指定週に案件切替したかを判定
 */
function isSwitcherInWeek(member: Member, weekStart: Date, weekEnd: Date): boolean {
  if (!member.workHistory || member.workHistory.length < 2) return false;
  
  // 最新の案件開始日が週内にあるかチェック
  const latestWork = member.workHistory[member.workHistory.length - 1];
  if (!latestWork.startDate) return false;
  
  const switchDate = new Date(latestWork.startDate);
  return switchDate >= weekStart && switchDate <= weekEnd && 
         member.workHistory.length > 1; // 複数案件履歴がある場合のみ
}

/**
 * 指定週に案件終了したかを判定
 */
function isProjectTerminatorInWeek(member: Member, weekStart: Date, weekEnd: Date): boolean {
  if (!member.workHistory) return false;
  
  // 案件終了日が週内にあるかチェック
  for (const work of member.workHistory) {
    if (work.endDate) {
      const endDate = new Date(work.endDate);
      if (endDate >= weekStart && endDate <= weekEnd) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 指定週に契約終了したかを判定
 */
function isContractEnderInWeek(member: Member, weekStart: Date, weekEnd: Date): boolean {
  if (!member.contractEndDate && !member.lastWorkEndDate) return false;
  
  const endDate = member.contractEndDate || member.lastWorkEndDate;
  if (!endDate) return false;
  
  return endDate >= weekStart && endDate <= weekEnd && 
         member.status === 'contract_ended';
}

/**
 * 指定週に稼働中かを判定
 */
function isWorkingInWeek(member: Member, weekStart: Date, weekEnd: Date): boolean {
  const startDate = member.firstWorkStartDate || member.lastWorkStartDate;
  const endDate = member.contractEndDate || member.lastWorkEndDate;
  
  // 開始日が週終了後 → 稼働していない
  if (startDate && startDate > weekEnd) return false;
  
  // 終了日が週開始前 → 稼働していない
  if (endDate && endDate < weekStart) return false;
  
  // 上記以外は稼働中
  return member.status === MemberStatus.WORKING;
} 