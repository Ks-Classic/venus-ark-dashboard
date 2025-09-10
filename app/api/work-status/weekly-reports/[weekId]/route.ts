export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { WeeklyWorkStatusReport } from '@/lib/types/work_status_report';

export async function GET(
  request: NextRequest,
  { params }: { params: { weekId: string } }
) {
  try {
    const { weekId } = await params;
    
    if (!weekId) {
      return NextResponse.json(
        { error: '週IDが指定されていません' },
        { status: 400 }
      );
    }

    // 新しい週識別子形式をパース: YYYY-MM-WXX (例: 2025-06-W01)
    const weekIdMatch = weekId.match(/^(\d{4})-(\d{2})-W(\d{2})$/);
    if (!weekIdMatch) {
      return NextResponse.json(
        { error: 'Invalid weekId format. Expected: YYYY-MM-WXX (e.g., 2025-06-W01)' },
        { status: 400 }
      );
    }

    const year = parseInt(weekIdMatch[1], 10);
    const month = parseInt(weekIdMatch[2], 10);
    const weekInMonth = parseInt(weekIdMatch[3], 10);

    const adminDb = getAdminDb();
    const docRef = adminDb.collection('weekly_work_status_reports').doc(weekId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: '指定された週のレポートが見つかりません' },
        { status: 404 }
      );
    }

    const data = doc.data() as WeeklyWorkStatusReport;
    
    // Timestampを日付に変換
    const report: WeeklyWorkStatusReport = {
      ...data,
      dateRange: {
        start: data.dateRange.start instanceof Date ? data.dateRange.start : (data.dateRange.start as any).toDate(),
        end: data.dateRange.end instanceof Date ? data.dateRange.end : (data.dateRange.end as any).toDate(),
      },
      createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate(),
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('週次レポート取得エラー:', error);
    return NextResponse.json(
      { error: 'レポートの取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 