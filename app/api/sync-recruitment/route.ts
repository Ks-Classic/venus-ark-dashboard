import { NextRequest, NextResponse } from 'next/server';
import { syncRecruitmentData } from '@/scripts/sync-recruitment-data';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  logger.info('API /api/sync-recruitment called');
  try {
    // weekパラメータは今のところ使用しないが、将来的な拡張のために残す
    const body = await req.json().catch(() => ({})); // ボディが空でもエラーにしない
    const { week } = body;

    if (week) {
      logger.info(`Sync requested for specific week: ${week}`);
    } else {
      logger.info('Sync requested for all data.');
    }

    // 同期処理を実行
    const result = await syncRecruitmentData(week);

    if (result.success) {
      logger.info({ msg: 'Sync process completed successfully.', data: result });
      return NextResponse.json(result);
    } else {
      logger.error({ msg: 'Sync process failed.', data: result });
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error: any) {
    logger.error({ msg: 'Unhandled error in /api/sync-recruitment', error: error.stack });
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred.', error: error.message },
      { status: 500 }
    );
  }
}
