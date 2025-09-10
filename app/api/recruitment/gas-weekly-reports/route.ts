export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getWeekDateRange, getWeekNumberFromDate } from '@/lib/date';

// GAS Web App URL（デプロイ後に更新）
const GAS_WEB_APP_URL = process.env.GAS_WEB_APP_URL
  || (process.env.GAS_SCRIPT_ID ? `https://script.google.com/macros/s/${process.env.GAS_SCRIPT_ID}/exec` : 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec');

interface GASRecruitmentMetrics {
  // 正式キー（GAS calculateAllMetrics の出力と一致）
  applyCount?: number;
  applyRejectCount?: number;
  applyContinueCount?: number;
  documentSubmitted?: number;
  documentRejectCount?: number;
  documentContinueCount?: number;
  interviewScheduled?: number;
  interviewConducted?: number;
  interviewCancelled?: number;
  hireCount?: number;
  offerAcceptedCount?: number;
  interviewRate?: number;
  acceptanceRate?: number;
  left?: number;
  rejectionBreakdown?: {
    experience?: number;
    age?: number;
    unfit?: number;
    foreign?: number;
    relocation?: number;
    declined?: number;
    other?: number;
  };

  // 後方互換のための別名（過去のレスポンスをフォロー）
  hired?: number;
  accepted?: number;
  applyRejected?: number;
  docRejected?: number;
}

interface GASWeeklyReport {
  success: boolean;
  week?: string;
  dateRange?: string;
  platform?: string;
  jobCategory?: string;
  metrics?: GASRecruitmentMetrics;
  error?: string;
  data?: {
    success: boolean;
    week: string;
    dateRange: string;
    platform: string;
    jobCategory: string;
    metrics: GASRecruitmentMetrics;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekSelector = searchParams.get('weekSelector');
    const platform = searchParams.get('platform') || 'all';
    const jobCategory = searchParams.get('jobCategory') || 'all';
    const yearParam = searchParams.get('year');

    if (!weekSelector) {
      return new NextResponse(JSON.stringify({ 
        error: 'weekSelector parameter is required',
        success: false 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // weekSelector: "8月2W" を解析
    const m = weekSelector.match(/(\d+)月(\d+)W/);
    const month = m ? parseInt(m[1]) : undefined;
    const weekInMonth = m ? parseInt(m[2]) : undefined;
    const year = yearParam ? parseInt(yearParam) : undefined;

    // GAS Web Appにリクエスト
    const gasUrl = new URL(GAS_WEB_APP_URL);
    gasUrl.searchParams.set('weekSelector', weekSelector);
    gasUrl.searchParams.set('platform', platform);
    gasUrl.searchParams.set('jobCategory', jobCategory);
    if (year) gasUrl.searchParams.set('year', String(year));
    if (month) gasUrl.searchParams.set('month', String(month));
    if (weekInMonth) gasUrl.searchParams.set('weekInMonth', String(weekInMonth));

    console.log(`[GAS API] Requesting: ${gasUrl.toString()}`);

    const response = await fetch(gasUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GAS API error: ${response.status} ${response.statusText}`);
    }

    const gasResponse = await response.json();

    // GASレスポンスの詳細ログ出力
    console.log(`[GAS API] Response received:`, {
      success: gasResponse.success,
      hasData: !!gasResponse.data,
      hasMetrics: !!(gasResponse.data && gasResponse.data.metrics),
      metricsKeys: gasResponse.data?.metrics ? Object.keys(gasResponse.data.metrics) : 'undefined',
      error: gasResponse.error,
      fullResponse: JSON.stringify(gasResponse, null, 2)
    });

    if (!gasResponse.success) {
      throw new Error(`GAS API returned error: ${gasResponse.error}`);
    }

    // GASレスポンスがdata構造を持つ場合の処理
    const gasResult = gasResponse.data || gasResponse;

    // metricsが存在しない場合の安全な処理
    if (!gasResult.metrics) {
      console.error('[GAS API] No metrics in response, returning error');
      return new NextResponse(JSON.stringify({ 
        error: 'GAS API response missing metrics data',
        details: 'GAS response structure is invalid',
        gasResponse: gasResponse,
        success: false 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 週のメタ情報を補完（UIの集計ロジックが期待するフィールド）
    let startDateStr: string | undefined;
    let endDateStr: string | undefined;
    let normalizedYear: number | undefined = year;
    let normalizedMonth: number | undefined = month;
    let normalizedWeekInMonth: number | undefined = weekInMonth;
    if (year && month && weekInMonth) {
      const { start, end } = getWeekDateRange(year, month, weekInMonth);
      startDateStr = start.toISOString().split('T')[0];
      endDateStr = end.toISOString().split('T')[0];
      const norm = getWeekNumberFromDate(start);
      normalizedYear = norm.year;
      normalizedMonth = norm.month;
      normalizedWeekInMonth = norm.weekInMonth;
    }

    // レスポンス形式を統一（安全なプロパティアクセス）
    const result = {
      id: `gas-${normalizedYear || 'yyyy'}-${normalizedMonth || 'mm'}-${normalizedWeekInMonth || 'w'}-${platform}-${jobCategory}`,
      reportType: 'recruitment',
      year: normalizedYear,
      month: normalizedMonth,
      weekInMonth: normalizedWeekInMonth,
      displayWeekLabel: `${normalizedMonth}月${normalizedWeekInMonth}W`,
      weekId: `${normalizedYear}-${String(normalizedMonth || 0).padStart(2,'0')}-W${String(normalizedWeekInMonth || 0).padStart(2,'0')}`,
      startDate: startDateStr,
      endDate: endDateStr,
      week: gasResult.week || weekSelector,
      dateRange: gasResult.dateRange || `${startDateStr} - ${endDateStr}`,
      platform: gasResult.platform || platform,
      jobCategory: gasResult.jobCategory || jobCategory,
      recruitmentMetrics: {
        applyCount: gasResult.metrics.applyCount ?? 0,
        applyRejectCount: (gasResult.metrics.applyRejectCount ?? gasResult.metrics.applyRejected) ?? 0,
        applyContinueCount: gasResult.metrics.applyContinueCount ?? 0,
        documentSubmitted: gasResult.metrics.documentSubmitted ?? 0,
        documentRejectCount: (gasResult.metrics.documentRejectCount ?? gasResult.metrics.docRejected) ?? 0,
        documentContinueCount: gasResult.metrics.documentContinueCount ?? 0,
        interviewScheduled: gasResult.metrics.interviewScheduled ?? 0,
        interviewConducted: gasResult.metrics.interviewConducted ?? 0,
        interviewCancelled: gasResult.metrics.interviewCancelled ?? 0,
        hireCount: (gasResult.metrics.hireCount ?? gasResult.metrics.hired) ?? 0,
        offerAcceptedCount: (gasResult.metrics.offerAcceptedCount ?? gasResult.metrics.accepted) ?? 0,
        rejectionBreakdown: {
          experienced: gasResult.metrics.rejectionBreakdown?.experience ?? 0,
          elderly: gasResult.metrics.rejectionBreakdown?.age ?? 0,
          unsuitable: gasResult.metrics.rejectionBreakdown?.unfit ?? 0,
          foreign: gasResult.metrics.rejectionBreakdown?.foreign ?? 0,
          relocation_check: gasResult.metrics.rejectionBreakdown?.relocation ?? 0,
          post_offer_withdrawal: gasResult.metrics.rejectionBreakdown?.declined ?? 0,
          other: gasResult.metrics.rejectionBreakdown?.other ?? 0,
        },
        interviewRate: gasResult.metrics.interviewRate ?? 0,
        hireRate: 0, // GASでは計算されていない
        acceptanceRate: gasResult.metrics.acceptanceRate ?? 0,
      },
      updatedAt: new Date(),
      source: 'gas',
    };

    console.log(`[GAS API] Success: ${result.id}`);

    return new NextResponse(JSON.stringify([result]), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('[GAS API] Error:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Failed to fetch GAS weekly reports', 
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { weekSelector, platform = 'all', jobCategory = 'all', year: yearParam } = body;

    if (!weekSelector) {
      return new NextResponse(JSON.stringify({ 
        error: 'weekSelector is required in request body',
        success: false 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // weekSelector: "8月2W" を解析
    const m = weekSelector.match(/(\d+)月(\d+)W/);
    const month = m ? parseInt(m[1]) : undefined;
    const weekInMonth = m ? parseInt(m[2]) : undefined;
    const year: number | undefined = typeof yearParam === 'number' ? yearParam : (typeof yearParam === 'string' ? parseInt(yearParam) : undefined);

    // GAS Web AppにPOSTリクエスト
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        weekSelector,
        platform,
        jobCategory,
      }),
    });

    if (!response.ok) {
      throw new Error(`GAS API error: ${response.status} ${response.statusText}`);
    }

    const gasResponse = await response.json();

    // GASレスポンスの詳細ログ出力
    console.log(`[GAS API] POST Response received:`, {
      success: gasResponse.success,
      hasData: !!gasResponse.data,
      hasMetrics: !!(gasResponse.data && gasResponse.data.metrics),
      metricsKeys: gasResponse.data?.metrics ? Object.keys(gasResponse.data.metrics) : 'undefined',
      error: gasResponse.error,
      fullResponse: JSON.stringify(gasResponse, null, 2)
    });

    if (!gasResponse.success) {
      throw new Error(`GAS API returned error: ${gasResponse.error}`);
    }

    // GASレスポンスがdata構造を持つ場合の処理
    const gasResult = gasResponse.data || gasResponse;

    // metricsが存在しない場合の安全な処理
    if (!gasResult.metrics) {
      console.error('[GAS API] POST: No metrics in response, returning error');
      return new NextResponse(JSON.stringify({ 
        error: 'GAS API response missing metrics data',
        details: 'GAS response structure is invalid',
        gasResponse: gasResponse,
        success: false 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 週のメタ情報を補完
    let startDateStr: string | undefined;
    let endDateStr: string | undefined;
    let normalizedYear: number | undefined = year;
    let normalizedMonth: number | undefined = month;
    let normalizedWeekInMonth: number | undefined = weekInMonth;
    if (year && month && weekInMonth) {
      const { start, end } = getWeekDateRange(year, month, weekInMonth);
      startDateStr = start.toISOString().split('T')[0];
      endDateStr = end.toISOString().split('T')[0];
      const norm = getWeekNumberFromDate(start);
      normalizedYear = norm.year;
      normalizedMonth = norm.month;
      normalizedWeekInMonth = norm.weekInMonth;
    }

    // レスポンス形式を統一（GETと同じ、安全なプロパティアクセス）
    const result = {
      id: `gas-${normalizedYear || 'yyyy'}-${normalizedMonth || 'mm'}-${normalizedWeekInMonth || 'w'}-${platform}-${jobCategory}`,
      reportType: 'recruitment',
      year: normalizedYear,
      month: normalizedMonth,
      weekInMonth: normalizedWeekInMonth,
      displayWeekLabel: `${normalizedMonth}月${normalizedWeekInMonth}W`,
      weekId: `${normalizedYear}-${String(normalizedMonth || 0).padStart(2,'0')}-W${String(normalizedWeekInMonth || 0).padStart(2,'0')}`,
      startDate: startDateStr,
      endDate: endDateStr,
      week: gasResult.week || weekSelector,
      dateRange: gasResult.dateRange || `${startDateStr} - ${endDateStr}`,
      platform: gasResult.platform || platform,
      jobCategory: gasResult.jobCategory || jobCategory,
      recruitmentMetrics: {
        applyCount: gasResult.metrics.applyCount || 0,
        applyRejectCount: gasResult.metrics.applyRejected || 0,
        applyContinueCount: gasResult.metrics.applyContinueCount || 0,
        documentSubmitted: gasResult.metrics.documentSubmitted || 0,
        documentRejectCount: gasResult.metrics.docRejected || 0,
        documentContinueCount: gasResult.metrics.documentContinueCount || 0,
        interviewScheduled: gasResult.metrics.interviewScheduled || 0,
        interviewConducted: gasResult.metrics.interviewConducted || 0,
        interviewCancelled: gasResult.metrics.interviewCancelled || 0,
        hireCount: gasResult.metrics.hired || 0,
        offerAcceptedCount: gasResult.metrics.accepted || 0,
        rejectionBreakdown: {
          experienced: gasResult.metrics.rejectionBreakdown?.experience || 0,
          elderly: gasResult.metrics.rejectionBreakdown?.age || 0,
          unsuitable: gasResult.metrics.rejectionBreakdown?.unfit || 0,
          foreign: gasResult.metrics.rejectionBreakdown?.foreign || 0,
          relocation_check: gasResult.metrics.rejectionBreakdown?.relocation || 0,
          post_offer_withdrawal: gasResult.metrics.rejectionBreakdown?.declined || 0,
          other: gasResult.metrics.rejectionBreakdown?.other || 0,
        },
        interviewRate: gasResult.metrics.interviewRate || 0,
        hireRate: 0, // GASでは計算されていない
        acceptanceRate: gasResult.metrics.acceptanceRate || 0,
      },
      updatedAt: new Date(),
      source: 'gas',
    };

    return new NextResponse(JSON.stringify([result]), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('[GAS API] Error:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Failed to fetch GAS weekly reports', 
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

