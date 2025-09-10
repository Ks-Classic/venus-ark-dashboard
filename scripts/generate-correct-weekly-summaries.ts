import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from '../venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json';

// Firebase Admin SDK初期化
if (!process.env.FIREBASE_ADMIN_INITIALIZED) {
  initializeApp({
    credential: cert(serviceAccount as any),
    projectId: 'venus-ark-aix'
  });
  process.env.FIREBASE_ADMIN_INITIALIZED = 'true';
}

const db = getFirestore();

interface Application {
  応募日: string;
  職種: string;
  媒体: string;
  現状ステータス: string;
  理由?: string;
  [key: string]: any;
}

interface WeeklySummary {
  id: string;
  year: number;
  month: number;
  weekInMonth: number;
  reportDate: string; // 報告日（土曜日）
  periodStart: string; // 集計開始（金曜日）
  periodEnd: string; // 集計終了（土曜日）
  jobCategories: {
    [category: string]: {
      indeed: JobCategoryMetrics;
      engage: JobCategoryMetrics;
      other: JobCategoryMetrics;
      total: JobCategoryMetrics;
    };
  };
  totals: {
    indeed: JobCategoryMetrics;
    engage: JobCategoryMetrics;
    other: JobCategoryMetrics;
    all: JobCategoryMetrics;
  };
}

interface JobCategoryMetrics {
  applications: number;
  rejected: number;
  continuing: number;
  documents: number;
  interviews: number;
  interviewsCompleted: number;
  interviewsDeclined: number;
  hired: number;
  accepted: number;
  withdrawn: number;
  rejectionReasons: {
    experienced: number;
    elderly: number;
    unsuitable: number;
    foreign: number;
    other: number;
  };
  conversionRates: {
    applicationToInterview: number;
    interviewToHire: number;
    hireToAcceptance: number;
  };
}

// 土曜日報告ベースの週計算
function calculateReportWeek(date: Date): {
  year: number;
  month: number;
  weekInMonth: number;
  reportDate: Date;
  periodStart: Date;
  periodEnd: Date;
} {
  // 報告日（土曜日）を基準に計算
  const reportDate = new Date(date);
  
  // 集計期間は前週金曜日から当週土曜日まで
  const periodEnd = new Date(reportDate);
  const periodStart = new Date(reportDate);
  periodStart.setDate(periodStart.getDate() - 7); // 7日前の金曜日
  
  // 報告月（土曜日の月）
  const month = reportDate.getMonth() + 1;
  const year = reportDate.getFullYear();
  
  // その月の第何週かを計算
  const firstDayOfMonth = new Date(year, reportDate.getMonth(), 1);
  const firstSaturday = new Date(firstDayOfMonth);
  
  // その月の最初の土曜日を見つける
  while (firstSaturday.getDay() !== 6) {
    firstSaturday.setDate(firstSaturday.getDate() + 1);
  }
  
  // 報告日が最初の土曜日から何週目かを計算
  const daysDiff = Math.floor((reportDate.getTime() - firstSaturday.getTime()) / (1000 * 60 * 60 * 24));
  const weekInMonth = Math.floor(daysDiff / 7) + 1;
  
  return {
    year,
    month,
    weekInMonth: Math.max(1, weekInMonth),
    reportDate,
    periodStart,
    periodEnd
  };
}

// 日付文字列をDateオブジェクトに変換
function parseApplicationDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // 様々な日付形式に対応
  const formats = [
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/M/D
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-M-D
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // M/D/YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[2]) {
        // M/D/YYYY形式
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
      } else {
        // YYYY/M/D または YYYY-M-D形式
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      }
    }
  }
  
  return null;
}

// メトリクス初期化
function createEmptyMetrics(): JobCategoryMetrics {
  return {
    applications: 0,
    rejected: 0,
    continuing: 0,
    documents: 0,
    interviews: 0,
    interviewsCompleted: 0,
    interviewsDeclined: 0,
    hired: 0,
    accepted: 0,
    withdrawn: 0,
    rejectionReasons: {
      experienced: 0,
      elderly: 0,
      unsuitable: 0,
      foreign: 0,
      other: 0
    },
    conversionRates: {
      applicationToInterview: 0,
      interviewToHire: 0,
      hireToAcceptance: 0
    }
  };
}

// アプリケーションデータを集計
function aggregateApplication(metrics: JobCategoryMetrics, app: Application) {
  metrics.applications++;
  
  const status = app.現状ステータス;
  const reason = app.理由;
  
  // ステータス別集計
  if (status === '応募落ち' || status === '不採用') {
    metrics.rejected++;
    
    // 不採用理由の分類
    if (reason) {
      if (reason.includes('経験') || reason.includes('スキル')) {
        metrics.rejectionReasons.experienced++;
      } else if (reason.includes('高齢') || reason.includes('年齢')) {
        metrics.rejectionReasons.elderly++;
      } else if (reason.includes('不適合') || reason.includes('ミスマッチ')) {
        metrics.rejectionReasons.unsuitable++;
      } else if (reason.includes('外国') || reason.includes('国籍')) {
        metrics.rejectionReasons.foreign++;
      } else {
        metrics.rejectionReasons.other++;
      }
    } else {
      metrics.rejectionReasons.other++;
    }
  } else if (status === 'フォーム回答待ち' || status === '応募落ち') {
    metrics.continuing++;
  } else if (status === '面談確定' || status === '面接確定') {
    metrics.interviews++;
    metrics.documents++;
  } else if (status === '採用') {
    metrics.hired++;
    metrics.accepted++;
    metrics.interviews++;
    metrics.interviewsCompleted++;
    metrics.documents++;
  }
  
  // 変換率計算
  if (metrics.applications > 0) {
    metrics.conversionRates.applicationToInterview = metrics.interviews / metrics.applications;
  }
  if (metrics.interviews > 0) {
    metrics.conversionRates.interviewToHire = metrics.hired / metrics.interviews;
  }
  if (metrics.hired > 0) {
    metrics.conversionRates.hireToAcceptance = metrics.accepted / metrics.hired;
  }
}

async function generateCorrectWeeklySummaries() {
  console.log('=== 正しい週次集計の生成開始 ===');
  
  try {
    // 全アプリケーションデータを取得
    console.log('📋 アプリケーションデータを取得中...');
    const applicationsSnapshot = await db.collection('applications').get();
    const applications: Application[] = [];
    
    applicationsSnapshot.docs.forEach(doc => {
      const data = doc.data() as Application;
      if (data.応募日) {
        applications.push(data);
      }
    });
    
    console.log(`取得したアプリケーション数: ${applications.length}`);
    
    // 週別にグループ化
    const weeklyGroups = new Map<string, Application[]>();
    
    applications.forEach(app => {
      const appDate = parseApplicationDate(app.応募日);
      if (!appDate) return;
      
      // 応募日から報告週を計算
      // 応募日が金曜日なら翌週の土曜日が報告日
      const reportSaturday = new Date(appDate);
      const dayOfWeek = appDate.getDay();
      
      if (dayOfWeek === 5) { // 金曜日
        reportSaturday.setDate(reportSaturday.getDate() + 1); // 翌日（土曜日）
      } else if (dayOfWeek === 6) { // 土曜日
        // そのまま
      } else {
        // 日曜～木曜日は次の土曜日
        const daysToSaturday = (6 - dayOfWeek) % 7;
        reportSaturday.setDate(reportSaturday.getDate() + daysToSaturday);
      }
      
      const weekInfo = calculateReportWeek(reportSaturday);
      const weekKey = `${weekInfo.year}-${weekInfo.month}月${weekInfo.weekInMonth}W`;
      
      if (!weeklyGroups.has(weekKey)) {
        weeklyGroups.set(weekKey, []);
      }
      weeklyGroups.get(weekKey)!.push(app);
    });
    
    console.log(`生成する週次サマリー数: ${weeklyGroups.size}`);
    
    // 各週のサマリーを生成
    const batch = db.batch();
    let processedCount = 0;
    
    for (const [weekKey, weekApps] of weeklyGroups) {
      const [yearMonth, weekPart] = weekKey.split('-');
      const year = parseInt(yearMonth);
      const monthMatch = weekPart.match(/(\d+)月(\d+)W/);
      if (!monthMatch) continue;
      
      const month = parseInt(monthMatch[1]);
      const weekInMonth = parseInt(monthMatch[2]);
      
      // 報告日を計算（その月の第N週の土曜日）
      const firstDayOfMonth = new Date(year, month - 1, 1);
      const firstSaturday = new Date(firstDayOfMonth);
      while (firstSaturday.getDay() !== 6) {
        firstSaturday.setDate(firstSaturday.getDate() + 1);
      }
      
      const reportDate = new Date(firstSaturday);
      reportDate.setDate(reportDate.getDate() + (weekInMonth - 1) * 7);
      
      const periodStart = new Date(reportDate);
      periodStart.setDate(periodStart.getDate() - 7);
      
      const summary: WeeklySummary = {
        id: weekKey,
        year,
        month,
        weekInMonth,
        reportDate: reportDate.toISOString().split('T')[0],
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: reportDate.toISOString().split('T')[0],
        jobCategories: {},
        totals: {
          indeed: createEmptyMetrics(),
          engage: createEmptyMetrics(),
          other: createEmptyMetrics(),
          all: createEmptyMetrics()
        }
      };
      
      // 職種別・媒体別に集計
      const jobCategories = ['SNS運用', '動画クリエイター', 'AIライター', '撮影スタッフ'];
      
      jobCategories.forEach(category => {
        summary.jobCategories[category] = {
          indeed: createEmptyMetrics(),
          engage: createEmptyMetrics(),
          other: createEmptyMetrics(),
          total: createEmptyMetrics()
        };
      });
      
      // アプリケーションを集計
      weekApps.forEach(app => {
        const jobCategory = app.職種 || 'その他';
        const mediaSource = app.媒体 === 'Indeed' ? 'indeed' : 
                           app.媒体 === 'エンゲージ' ? 'engage' : 'other';
        
        // 職種別集計
        if (summary.jobCategories[jobCategory]) {
          aggregateApplication(summary.jobCategories[jobCategory][mediaSource], app);
          aggregateApplication(summary.jobCategories[jobCategory].total, app);
        }
        
        // 全体集計
        aggregateApplication(summary.totals[mediaSource], app);
        aggregateApplication(summary.totals.all, app);
      });
      
      // Firestoreに保存
      const docRef = db.collection('correct_weekly_summaries').doc(weekKey);
      batch.set(docRef, summary);
      
      processedCount++;
      if (processedCount % 50 === 0) {
        console.log(`処理済み: ${processedCount}/${weeklyGroups.size}`);
      }
    }
    
    // バッチコミット
    console.log('📝 Firestoreに保存中...');
    await batch.commit();
    
    console.log('✅ 正しい週次集計の生成完了');
    console.log(`生成されたサマリー数: ${weeklyGroups.size}`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
generateCorrectWeeklySummaries().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 