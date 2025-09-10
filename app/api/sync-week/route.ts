import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { syncRecruitmentData } from '@/scripts/sync-recruitment-data';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { year, month, weekInMonth } = body;

  if (!year || !month || !weekInMonth) {
    return NextResponse.json(
      { success: false, message: 'Year, month, and weekInMonth are required.' },
      { status: 400 }
    );
  }

  logger.info({ msg: `API /api/sync-week called for ${year}-${month}-${weekInMonth}` });

  try {
    // 週次同期のオプションを渡して同期処理を実行
    const result = await syncRecruitmentData({ year, month, weekInMonth });

    if (result.success) {
      logger.info({ msg: 'Weekly sync process completed successfully.', data: result });
      return NextResponse.json(result);
    } else {
      logger.error({ msg: 'Weekly sync process failed.', data: result });
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error: any) {
    logger.error({ msg: 'Unhandled error in /api/sync-week', error: error.stack });
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred.', error: error.message },
      { status: 500 }
    );
  }
}
