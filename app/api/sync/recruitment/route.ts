import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { week } = body;

    let command = 'npm run sync:recruitment';

    // 週次同期のパラメータが指定されている場合、コマンドに追加
    if (week && week.year && week.month && week.weekInMonth) {
      const { year, month, weekInMonth } = week;
      command += ` -- --week=${year}-${month}-${weekInMonth}`;
      console.log(`Recruitment data sync started via API for week: ${year}-${month}-${weekInMonth}...`);
    } else {
      console.log('Recruitment data sync started via API for all data...');
    }
    
    // package.jsonの"sync:recruitment"スクリプトを実行
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Sync script stderr:', stderr);
    }

    console.log('Sync script stdout:', stdout);
    console.log('Recruitment data sync completed successfully.');

    // Firestoreの結果整合性を考慮し、UIが再取得する前にデータが反映されるよう、意図的に少し待機する
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 標準出力から結果JSONを抽出
    const resultLine = stdout.split('\n').find(line => line.startsWith('SYNC_RESULT::'));
    if (resultLine) {
      const jsonResult = resultLine.replace('SYNC_RESULT::', '');
      const parsedResult = JSON.parse(jsonResult);
      
      if (parsedResult.success) {
        return NextResponse.json(parsedResult);
      } else {
        return NextResponse.json(
          { 
            success: false,
            message: parsedResult.message || '同期処理中にエラーが発生しました。',
            error: parsedResult.error 
          },
          { status: 500 }
        );
      }
    }

    // 結果が見つからない場合はエラーとして扱う
    console.error('Sync result not found in stdout:', stdout);
    return NextResponse.json(
      { 
        success: false,
        message: '同期処理が正常に完了しましたが、結果データの取得に失敗しました。',
        error: 'SYNC_RESULT not found in output'
      },
      { status: 500 }
    );

  } catch (error) {
    console.error('Failed to execute recruitment data sync script:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: '同期処理中にエラーが発生しました。', error: errorMessage },
      { status: 500 }
    );
  }
}
