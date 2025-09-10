import { NextRequest, NextResponse } from 'next/server';

// GASスクリプトのID（環境変数から読み込み、未設定の場合は手動設定）
const GAS_SCRIPT_ID = process.env.GAS_SCRIPT_ID || 'YOUR_GAS_SCRIPT_ID_HERE';

// 環境変数が未設定の場合の警告
if (!process.env.GAS_SCRIPT_ID) {
  console.warn('⚠️ GAS_SCRIPT_ID環境変数が設定されていません。.env.localに設定してください。');
}

export async function POST(request: NextRequest) {
  try {
    const { weekSelector, platform = 'all', jobCategory = 'all' } = await request.json();

    if (!weekSelector) {
      return NextResponse.json(
        { error: '週選択が必要です' },
        { status: 400 }
      );
    }

    // GASのWeb App URL
    const gasUrl = `https://script.google.com/macros/s/${GAS_SCRIPT_ID}/exec`;

    // GASにリクエスト送信
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generateFilteredReport',
        weekSelector,
        platform,
        jobCategory,
      }),
    });

    if (!response.ok) {
      throw new Error(`GAS request failed: ${response.statusText}`);
    }

    const result = await response.json();

    return NextResponse.json(result);

  } catch (error) {
    console.error('GAS API error:', error);
    return NextResponse.json(
      { 
        error: 'GASからのデータ取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 週次レポート取得（GET）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekSelector = searchParams.get('week');
    const platform = searchParams.get('platform') || 'all';
    const jobCategory = searchParams.get('jobCategory') || 'all';

    if (!weekSelector) {
      return NextResponse.json(
        { error: '週選択が必要です' },
        { status: 400 }
      );
    }

    // GASのWeb App URL
    const gasUrl = `https://script.google.com/macros/s/${GAS_SCRIPT_ID}/exec`;

    // GASにリクエスト送信
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generateFilteredReport',
        weekSelector,
        platform,
        jobCategory,
      }),
    });

    if (!response.ok) {
      throw new Error(`GAS request failed: ${response.statusText}`);
    }

    const result = await response.json();

    return NextResponse.json(result);

  } catch (error) {
    console.error('GAS API error:', error);
    return NextResponse.json(
      { 
        error: 'GASからのデータ取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
