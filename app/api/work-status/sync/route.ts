import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebase/admin';
import { fetchMembers, fetchProjects, fetchMemberProjectStatuses } from '@/lib/integrations/notion';
import { saveMembers } from '@/lib/firestore/members';
import { saveProjects, saveMemberProjectStatus } from '@/lib/firestore/projects';
import { generateWeeklyWorkStatusDetail } from '@/lib/analytics/enhanced-work-status-aggregation';
import { getWeekNumberFromDate } from '@/lib/date';

// Firebase Admin SDKの初期化
initializeFirebaseAdmin();

export async function POST(request: NextRequest) {
  // --- デバッグログを追加 ---
  console.log('--- 環境変数デバッグ情報 ---');
  console.log(`NOTION_TOKEN (最初の5文字): ${process.env.NOTION_TOKEN?.substring(0, 5)}...`);
  console.log(`NOTION_MEMBER_DB_ID (最初の5文字): ${process.env.NOTION_MEMBER_DB_ID?.substring(0, 5)}...`);
  console.log('--------------------------');
  
  try {
    console.log('稼働状況データ同期開始...');
    
    // 1. Notionからメンバーデータを取得・同期
    console.log('メンバーデータを同期中...');
    const members = await fetchMembers(500);
    
    // 新しいステータスのメンバーをカウント
    const statusCounts = {
      working: 0,
      jobMatching: 0,
      interviewPrep: 0,
      interview: 0,
      resultWaiting: 0,
      hired: 0,
      other: 0
    };
    
    members.forEach(member => {
      switch (member.status) {
        case 'working':
          statusCounts.working++;
          break;
        case 'job_matching':
          statusCounts.jobMatching++;
          break;
        case 'interview_prep':
          statusCounts.interviewPrep++;
          break;
        case 'interview':
          statusCounts.interview++;
          break;
        case 'result_waiting':
          statusCounts.resultWaiting++;
          break;
        case 'hired':
          statusCounts.hired++;
          break;
        default:
          statusCounts.other++;
      }
    });
    
    console.log('🔍 メンバーステータス分布:');
    console.log(`  - 稼働中: ${statusCounts.working}人`);
    console.log(`  - 案件斡旋: ${statusCounts.jobMatching}人`);
    console.log(`  - 面接対策: ${statusCounts.interviewPrep}人`);
    console.log(`  - 面接: ${statusCounts.interview}人`);
    console.log(`  - 結果待ち: ${statusCounts.resultWaiting}人`);
    console.log(`  - 採用: ${statusCounts.hired}人`);
    console.log(`  - その他: ${statusCounts.other}人`);
    
    await saveMembers(members, true);
    console.log(`${members.length}件のメンバーデータを同期しました`);
    
    // 2. Notionから案件データを取得・同期（環境変数が未設定の場合はスキップ）
    let projects: any[] = [];
    if (process.env.NOTION_PROJECT_DB_ID) {
      console.log('案件データを同期中...');
      try {
        projects = await fetchProjects(200);
        await saveProjects(projects, true);
        console.log(`${projects.length}件の案件データを同期しました`);
      } catch (error) {
        console.warn('[WARN] 案件データ同期エラー:', error);
      }
    } else {
      console.warn('[WARN] NOTION_PROJECT_DB_ID が未設定のため、案件データ同期はスキップします');
    }
    
    // 3. Notionからメンバー別案件状況を取得・同期（環境変数が未設定の場合はスキップ）
    let statuses: any[] = [];
    if (process.env.NOTION_MEMBER_PROJECT_RELATION_DB_ID) {
      console.log('メンバー別案件状況を同期中...');
      try {
        statuses = await fetchMemberProjectStatuses(1000);
        for (const status of statuses) {
          await saveMemberProjectStatus(status, true);
        }
        console.log(`${statuses.length}件のメンバー別案件状況を同期しました`);
      } catch (error) {
        console.warn('[WARN] メンバー別案件状況同期エラー:', error);
      }
    } else {
      console.warn('[WARN] NOTION_MEMBER_PROJECT_RELATION_DB_ID が未設定のため、メンバー別案件状況同期はスキップします');
    }
    
    // 4. 現在週の週次レポートを生成（staffMetrics自動保存付き）
    const now = new Date();
    const { year, month, weekInMonth } = getWeekNumberFromDate(now);
    console.log(`${year}年${month}月第${weekInMonth}週のレポートを生成中...`);
    
    const weeklyDetail = generateWeeklyWorkStatusDetail(members, year, month, weekInMonth);
    console.log('週次レポート生成完了（staffMetrics自動保存済み）');
    
    return NextResponse.json({
      success: true,
      memberCount: members.length,
      projectCount: projects.length,
      memberProjectStatusCount: statuses.length,
      statusBreakdown: statusCounts,
      generatedReport: {
        year,
        month,
        weekInMonth,
        weekDetails: weeklyDetail.weekDetails.length,
        staffMetricsAutoSaved: true
      }
    });
  } catch (error) {
    console.error('データ同期エラー:', error);
    return NextResponse.json(
      { 
        error: 'データ同期中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 