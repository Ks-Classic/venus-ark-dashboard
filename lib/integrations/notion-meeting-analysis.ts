import { Client } from '@notionhq/client';

// Notion APIクライアントの初期化
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// 面談種別の型定義
export type MeetingType = '採用面談' | '初回カウンセリング' | '月次面談' | 'フォロー面談' | 'その他';

// 面談記録の型定義
export interface MeetingRecord {
  id: string;
  notionPageId: string;
  meetingDate: string;
  meetingType: MeetingType;
  participants: string[];
  memberName: string;
  content: string;
  summary?: string;
  actionItems?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 面談分析結果の型定義
export interface MeetingAnalysis {
  totalMeetings: number;
  meetingsByType: { [key in MeetingType]: number };
  memberMeetingCounts: { [memberName: string]: number };
  recentMeetings: MeetingRecord[];
  insights: {
    mostActiveMember: string;
    mostCommonMeetingType: MeetingType;
    averageMeetingsPerWeek: number;
    riskMembers: string[]; // 面談頻度が高いメンバー
  };
}

/**
 * Notion面談議事録DBからデータを取得
 */
export async function fetchMeetingRecords(
  startDate?: string,
  endDate?: string,
  limit: number = 100
): Promise<MeetingRecord[]> {
  try {
    const databaseId = process.env.NOTION_MEETING_DB_ID;
    if (!databaseId) {
      throw new Error('NOTION_MEETING_DB_ID が設定されていません');
    }

    // クエリフィルターの構築
    const filter: any = {};
    if (startDate || endDate) {
      filter.and = [];
      if (startDate) {
        filter.and.push({
          property: '面談日',
          date: { on_or_after: startDate }
        });
      }
      if (endDate) {
        filter.and.push({
          property: '面談日',
          date: { on_or_before: endDate }
        });
      }
    }

    const response = await notion.databases.query({
      database_id: databaseId,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sorts: [
        {
          property: '面談日',
          direction: 'descending'
        }
      ],
      page_size: limit
    });

    return response.results.map(page => parseMeetingRecord(page as any));
  } catch (error) {
    console.error('面談記録取得エラー:', error);
    throw error;
  }
}

/**
 * NotionページデータをMeetingRecordに変換
 */
function parseMeetingRecord(page: any): MeetingRecord {
  const properties = page.properties;
  
  return {
    id: page.id,
    notionPageId: page.id,
    meetingDate: properties['面談日']?.date?.start || '',
    meetingType: properties['面談種別']?.select?.name || 'その他',
    participants: properties['参加者']?.multi_select?.map((p: any) => p.name) || [],
    memberName: extractMemberName(properties),
    content: properties['議事内容']?.rich_text?.[0]?.plain_text || '',
    summary: properties['要約']?.rich_text?.[0]?.plain_text || '',
    actionItems: properties['アクションアイテム']?.rich_text?.[0]?.plain_text || '',
    createdAt: new Date(page.created_time),
    updatedAt: new Date(page.last_edited_time)
  };
}

/**
 * メンバー名を抽出（リレーションまたはテキストから）
 */
function extractMemberName(properties: any): string {
  // リレーションからメンバー名を取得
  if (properties['メンバー']?.relation?.[0]) {
    // 実際の実装では、リレーション先のページを取得してタイトルを取得する必要がある
    return 'メンバー名要取得'; // プレースホルダー
  }
  
  // タイトルからメンバー名を抽出（例: "山田太郎_月次面談_2024-01-15"）
  const title = properties['Name']?.title?.[0]?.plain_text || '';
  const memberName = title.split('_')[0];
  return memberName || '不明';
}

/**
 * 面談データの分析を実行
 */
export async function analyzeMeetingData(
  startDate?: string,
  endDate?: string
): Promise<MeetingAnalysis> {
  try {
    const meetings = await fetchMeetingRecords(startDate, endDate);
    
    // 面談種別別の集計
    const meetingsByType: { [key in MeetingType]: number } = {
      '採用面談': 0,
      '初回カウンセリング': 0,
      '月次面談': 0,
      'フォロー面談': 0,
      'その他': 0
    };

    // メンバー別面談回数の集計
    const memberMeetingCounts: { [memberName: string]: number } = {};

    meetings.forEach(meeting => {
      // 面談種別別集計
      meetingsByType[meeting.meetingType]++;
      
      // メンバー別集計
      if (meeting.memberName && meeting.memberName !== '不明') {
        memberMeetingCounts[meeting.memberName] = 
          (memberMeetingCounts[meeting.memberName] || 0) + 1;
      }
    });

    // インサイトの計算
    const insights = calculateMeetingInsights(meetings, memberMeetingCounts, meetingsByType);

    return {
      totalMeetings: meetings.length,
      meetingsByType,
      memberMeetingCounts,
      recentMeetings: meetings.slice(0, 10), // 最新10件
      insights
    };
  } catch (error) {
    console.error('面談データ分析エラー:', error);
    throw error;
  }
}

/**
 * 面談データからインサイトを計算
 */
function calculateMeetingInsights(
  meetings: MeetingRecord[],
  memberCounts: { [memberName: string]: number },
  typesCounts: { [key in MeetingType]: number }
): MeetingAnalysis['insights'] {
  // 最も活発なメンバー
  const mostActiveMember = Object.entries(memberCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || '該当なし';

  // 最も多い面談種別
  const mostCommonMeetingType = (Object.entries(typesCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'その他') as MeetingType;

  // 週平均面談数の計算
  const weekSpan = calculateWeekSpan(meetings);
  const averageMeetingsPerWeek = weekSpan > 0 ? meetings.length / weekSpan : 0;

  // リスクメンバー（面談頻度が高い = フォローが必要な可能性）
  const riskMembers = Object.entries(memberCounts)
    .filter(([, count]) => count >= 3) // 3回以上面談しているメンバー
    .map(([name]) => name);

  return {
    mostActiveMember,
    mostCommonMeetingType,
    averageMeetingsPerWeek: Math.round(averageMeetingsPerWeek * 10) / 10,
    riskMembers
  };
}

/**
 * 面談データから週数を計算
 */
function calculateWeekSpan(meetings: MeetingRecord[]): number {
  if (meetings.length === 0) return 0;
  
  const dates = meetings
    .map(m => new Date(m.meetingDate))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  
  if (dates.length === 0) return 0;
  
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const diffTime = lastDate.getTime() - firstDate.getTime();
  const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
  
  return Math.max(1, Math.ceil(diffWeeks));
}

/**
 * 特定メンバーの面談履歴を取得
 */
export async function getMemberMeetingHistory(
  memberName: string,
  limit: number = 20
): Promise<MeetingRecord[]> {
  try {
    const databaseId = process.env.NOTION_MEETING_DB_ID;
    if (!databaseId) {
      throw new Error('NOTION_MEETING_DB_ID が設定されていません');
    }

    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Name',
        title: {
          contains: memberName
        }
      },
      sorts: [
        {
          property: '面談日',
          direction: 'descending'
        }
      ],
      page_size: limit
    });

    return response.results.map(page => parseMeetingRecord(page as any));
  } catch (error) {
    console.error(`${memberName}の面談履歴取得エラー:`, error);
    throw error;
  }
}

/**
 * 面談記録をFirestoreに同期するためのデータ変換
 */
export function convertToFirestoreFormat(meeting: MeetingRecord) {
  return {
    id: meeting.id,
    notionMeetingId: meeting.notionPageId,
    meetingDate: meeting.meetingDate,
    meetingType: meeting.meetingType,
    participants: meeting.participants,
    memberName: meeting.memberName,
    content: meeting.content,
    summary: meeting.summary || null,
    actionItems: meeting.actionItems || null,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
    lastSyncedAt: new Date()
  };
} 