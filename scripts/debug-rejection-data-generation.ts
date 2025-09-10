#!/usr/bin/env npx tsx
/**
 * 内不採用数が0になる問題の調査スクリプト
 * Firebase接続なしでロジックを検証
 */

// モックデータ型定義
interface MockApplication {
  id: string;
  applicationDate: string;
  status: string;
  rejectionReason?: string;
  formSubmissionTimestamp?: string;
  interviewDate?: string;
  interviewImplementedDate?: string;
  acceptanceDate?: string;
  jobCategory: string;
  mediaSource: string;
}

interface RecruitmentMetrics {
  applications: number;
  application_rejections: number;
  application_continuing: number;
  documents: number;
  document_rejections: number;
  document_continuing: number;
  interview_scheduled: number;
  interview_withdrawals: number;
  interviews: number;
  hires: number;
  acceptances: number;
  rejections: number;
  withdrawals: number;
  rejectionBreakdown: {
    experienced: number;
    elderly: number;
    unsuitable: number;
    foreign: number;
    other: number;
  };
  interviewRate: number;
  hireRate: number;
  acceptanceRate: number;
}

// calculateRecruitmentMetrics関数の実装（lib/analytics/weekly-aggregation.tsから）
function calculateRecruitmentMetrics(applications: MockApplication[], startDateStr: string, endDateStr: string): RecruitmentMetrics {
  console.log(`\n--- calculateRecruitmentMetrics 実行 ---`);
  console.log(`期間: ${startDateStr} 〜 ${endDateStr}`);
  console.log(`対象データ数: ${applications.length}件`);

  // 1. 応募数：採用管理シート期間内のレコード数
  const applications_count = applications.filter(app => 
    app.applicationDate >= startDateStr && app.applicationDate <= endDateStr
  ).length;
  console.log(`1. 応募数: ${applications_count}件`);

  // 2. 内不採用数：採用管理シートステータス 応募落ち
  const application_rejections = applications.filter(app => 
    app.applicationDate >= startDateStr && 
    app.applicationDate <= endDateStr &&
    app.status === '応募落ち'
  ).length;
  console.log(`2. 内不採用数（応募落ち）: ${application_rejections}件`);

  // 3. 内選考継続数：応募数 - 内不採用数
  const application_continuing = applications_count - application_rejections;
  console.log(`3. 内選考継続数: ${application_continuing}件`);

  // 4. 書類提出数：応募フォームシートのタイムスタンプが集計期間内のレコード数
  const documents = applications.filter(app => {
    if (!app.formSubmissionTimestamp) return false;
    const submissionDate = app.formSubmissionTimestamp.split(' ')[0]; // 日付部分のみ取得
    return submissionDate >= startDateStr && submissionDate <= endDateStr;
  }).length;
  console.log(`4. 書類提出数: ${documents}件`);

  // 5. 書類内不採用数：応募フォームシートのタイムスタンプが集計期間内で採用管理シートのステータスが書類落ちの数
  const document_rejections = applications.filter(app => {
    if (!app.formSubmissionTimestamp) return false;
    const submissionDate = app.formSubmissionTimestamp.split(' ')[0];
    return submissionDate >= startDateStr && 
           submissionDate <= endDateStr &&
           app.status === '書類落ち';
  }).length;
  console.log(`5. 書類内不採用数（書類落ち）: ${document_rejections}件`);

  // 6. 書類内選考継続数：書類提出数 - 内不採用数
  const document_continuing = documents - document_rejections;
  console.log(`6. 書類内選考継続数: ${document_continuing}件`);

  // 7. 面接予定数：ステータス面談確定で、面談予定日時が集計期間内にある数
  const interview_scheduled = applications.filter(app => 
    app.status === '面談確定' &&
    app.interviewDate &&
    app.interviewDate >= startDateStr &&
    app.interviewDate <= endDateStr
  ).length;
  console.log(`7. 面接予定数: ${interview_scheduled}件`);

  // 8. 内面接辞退数：面談予定日時が期間内で、ステータスが面談不参加、離脱の数
  const interview_withdrawals = applications.filter(app => 
    app.interviewDate &&
    app.interviewDate >= startDateStr &&
    app.interviewDate <= endDateStr &&
    (app.status === '面談不参加' || app.status === '離脱')
  ).length;
  console.log(`8. 内面接辞退数: ${interview_withdrawals}件`);

  // 9. 内面接実施数：面談予定数 - 内面接辞退数
  const interviews = interview_scheduled - interview_withdrawals;
  console.log(`9. 内面接実施数: ${interviews}件`);

  // 10. 採用者数：面談実施のうち、ステータス採用の数
  const hires = applications.filter(app => 
    app.interviewImplementedDate &&
    app.interviewImplementedDate >= startDateStr &&
    app.interviewImplementedDate <= endDateStr &&
    app.status === '採用'
  ).length;
  console.log(`10. 採用者数: ${hires}件`);

  // 11. 内定受託数：その週に内定受諾があった数
  const acceptances = applications.filter(app => 
    app.acceptanceDate &&
    app.acceptanceDate >= startDateStr &&
    app.acceptanceDate <= endDateStr
  ).length;
  console.log(`11. 内定受諾数: ${acceptances}件`);

  // 従来の不採用数（全体）
  const rejections = applications.filter(app => app.status === '不採用').length;
  const withdrawals = applications.filter(app => app.status === '辞退').length;
  console.log(`従来の不採用数: ${rejections}件`);
  console.log(`辞退数: ${withdrawals}件`);

  const rejectionBreakdown = calculateRejectionBreakdown(applications);
  console.log(`不採用理由内訳:`, rejectionBreakdown);

  // 計算値
  const interviewRate = applications_count > 0 ? (interviews / applications_count) * 100 : 0;
  const hireRate = interviews > 0 ? (hires / interviews) * 100 : 0;
  const acceptanceRate = (hires + withdrawals) > 0 ? (hires / (hires + withdrawals)) * 100 : 0;

  return {
    applications: applications_count,
    application_rejections,
    application_continuing,
    documents,
    document_rejections,
    document_continuing,
    interview_scheduled,
    interview_withdrawals,
    interviews,
    hires,
    acceptances,
    rejections,
    withdrawals,
    rejectionBreakdown,
    interviewRate: Math.round(interviewRate * 10) / 10,
    hireRate: Math.round(hireRate * 10) / 10,
    acceptanceRate: Math.round(acceptanceRate * 10) / 10,
  };
}

function calculateRejectionBreakdown(applications: MockApplication[]) {
  const breakdown = {
    experienced: 0,
    elderly: 0,
    unsuitable: 0,
    foreign: 0,
    other: 0
  };

  const rejectedApplications = applications.filter(app => app.status === '不採用');
  console.log(`不採用理由内訳計算: 対象${rejectedApplications.length}件`);

  for (const app of rejectedApplications) {
    switch (app.rejectionReason) {
      case '経験不足':
        breakdown.experienced++;
        break;
      case '年齢制限':
        breakdown.elderly++;
        break;
      case '不適合':
        breakdown.unsuitable++;
        break;
      case '外国籍':
        breakdown.foreign++;
        break;
      case 'その他':
      default:
        breakdown.other++;
        break;
    }
  }

  return breakdown;
}

function createMockApplicationData(): MockApplication[] {
  // 2025年6月3週（2025-06-21〜2025-06-27）のテストデータを作成
  const weekStart = '2025-06-21';
  const weekEnd = '2025-06-27';

  const mockData: MockApplication[] = [
    // 正常な応募〜採用フロー
    {
      id: 'app001',
      applicationDate: '2025-06-21',
      status: '採用',
      jobCategory: 'SNS運用',
      mediaSource: 'indeed',
      formSubmissionTimestamp: '2025-06-21 10:00:00',
      interviewDate: '2025-06-23',
      interviewImplementedDate: '2025-06-23',
      acceptanceDate: '2025-06-25'
    },
    // 応募落ち
    {
      id: 'app002',
      applicationDate: '2025-06-22',
      status: '応募落ち',
      jobCategory: 'SNS運用',
      mediaSource: 'engage',
      rejectionReason: '経験不足'
    },
    // 書類落ち
    {
      id: 'app003',
      applicationDate: '2025-06-21',
      status: '書類落ち',
      jobCategory: 'SNS運用',
      mediaSource: 'indeed',
      formSubmissionTimestamp: '2025-06-22 14:00:00',
      rejectionReason: '不適合'
    },
    // 面談確定
    {
      id: 'app004',
      applicationDate: '2025-06-20',
      status: '面談確定',
      jobCategory: 'SNS運用',
      mediaSource: 'engage',
      formSubmissionTimestamp: '2025-06-20 16:00:00',
      interviewDate: '2025-06-24'
    },
    // 従来の不採用ステータス
    {
      id: 'app005',
      applicationDate: '2025-06-23',
      status: '不採用',
      jobCategory: 'SNS運用',
      mediaSource: 'indeed',
      rejectionReason: '年齢制限'
    },
    // 期間外のデータ（カウントされないはず）
    {
      id: 'app006',
      applicationDate: '2025-06-19',
      status: '応募落ち',
      jobCategory: 'SNS運用',
      mediaSource: 'indeed',
      rejectionReason: '外国籍'
    },
    // 辞退
    {
      id: 'app007',
      applicationDate: '2025-06-22',
      status: '辞退',
      jobCategory: 'SNS運用',
      mediaSource: 'engage'
    }
  ];

  return mockData;
}

function debugRejectionDataGeneration() {
  console.log('🔍 内不採用数が0になる問題の調査\n');

  // テストデータ作成
  const mockApplications = createMockApplicationData();
  console.log('📋 モックデータ作成完了');
  console.log(`総データ数: ${mockApplications.length}件\n`);

  // データ詳細表示
  console.log('📋 Phase 1: モックデータの内容確認\n');
  mockApplications.forEach((app, index) => {
    console.log(`${index + 1}. ID: ${app.id}`);
    console.log(`   応募日: ${app.applicationDate}`);
    console.log(`   ステータス: ${app.status}`);
    console.log(`   不採用理由: ${app.rejectionReason || 'なし'}`);
    console.log(`   フォーム送信: ${app.formSubmissionTimestamp || 'なし'}`);
    console.log(`   面接日: ${app.interviewDate || 'なし'}`);
    console.log('');
  });

  // ステータス分布確認
  console.log('📋 Phase 2: ステータス分布確認\n');
  const statusCounts: { [key: string]: number } = {};
  mockApplications.forEach(app => {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
  });

  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`${status}: ${count}件`);
  });

  // 2025年6月3週でのメトリクス計算
  console.log('\n📋 Phase 3: 2025年6月3週（2025-06-21〜2025-06-27）でのメトリクス計算\n');
  const weekStart = '2025-06-21';
  const weekEnd = '2025-06-27';
  
  const metrics = calculateRecruitmentMetrics(mockApplications, weekStart, weekEnd);

  console.log('\n--- 最終結果 ---');
  console.log(`応募数: ${metrics.applications}`);
  console.log(`内不採用数（応募落ち）: ${metrics.application_rejections}`);
  console.log(`書類内不採用数（書類落ち）: ${metrics.document_rejections}`);
  console.log(`従来の不採用数: ${metrics.rejections}`);
  console.log(`不採用理由内訳:`, metrics.rejectionBreakdown);

  // 問題点の分析
  console.log('\n📋 Phase 4: 問題分析\n');
  
  if (metrics.application_rejections === 0) {
    console.log('❌ 問題検出: 応募内不採用数が0');
    const applicationRejectionApps = mockApplications.filter(app => 
      app.applicationDate >= weekStart && 
      app.applicationDate <= weekEnd &&
      app.status === '応募落ち'
    );
    console.log(`期間内の応募落ちデータ: ${applicationRejectionApps.length}件`);
    if (applicationRejectionApps.length > 0) {
      console.log('データは存在するが、カウントされていない可能性');
    } else {
      console.log('そもそも該当データが存在しない');
    }
  } else {
    console.log('✅ 応募内不採用数は正常にカウントされている');
  }

  if (metrics.document_rejections === 0) {
    console.log('❌ 問題検出: 書類内不採用数が0');
    const documentRejectionApps = mockApplications.filter(app => {
      if (!app.formSubmissionTimestamp) return false;
      const submissionDate = app.formSubmissionTimestamp.split(' ')[0];
      return submissionDate >= weekStart && 
             submissionDate <= weekEnd &&
             app.status === '書類落ち';
    });
    console.log(`期間内の書類落ちデータ: ${documentRejectionApps.length}件`);
  } else {
    console.log('✅ 書類内不採用数は正常にカウントされている');
  }

  const totalRejectionReasons = Object.values(metrics.rejectionBreakdown).reduce((sum, count) => sum + count, 0);
  if (totalRejectionReasons === 0) {
    console.log('❌ 問題検出: 不採用理由内訳の合計が0');
    const rejectedApps = mockApplications.filter(app => app.status === '不採用');
    console.log(`不採用ステータスのデータ: ${rejectedApps.length}件`);
  } else {
    console.log('✅ 不採用理由内訳は正常にカウントされている');
  }

  console.log('\n🎯 調査結果まとめ\n');
  console.log('【確認事項】:');
  console.log('1. 実際のFirestoreデータでステータス値が正しく設定されているか');
  console.log('2. 期間フィルタリングが正しく動作しているか');
  console.log('3. 週次サマリー生成時に正しい関数が呼び出されているか');
  console.log('4. UIでの表示時にデータが正しく受け渡されているか');
}

// スクリプト実行
debugRejectionDataGeneration(); 