#!/usr/bin/env npx tsx
/**
 * 採用活動の週ずれ問題調査スクリプト
 */

import { initializeFirebaseAdmin, getAdminDb } from '@/lib/firebase/admin';
import { getWeekRange } from '@/lib/analytics/weekly-aggregation';

// Firebase Admin初期化
initializeFirebaseAdmin();

interface WeekTestCase {
  name: string;
  year: number;
  month: number;
  weekInMonth: number;
  expectedWeekLabel: string;
}

// 期間選択からISO週番号への変換関数（use-optimized-weekly-summaries.tsから）
function convertPeriodSelectionToISOWeek(year: number, month: number, weekInMonth: number): { year: number; weekNumber: number } {
  // その月の第N週の土曜日を計算
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const firstSaturday = new Date(firstDayOfMonth);
  while (firstSaturday.getDay() !== 6) {
    firstSaturday.setDate(firstSaturday.getDate() + 1);
  }
  
  const reportSaturday = new Date(firstSaturday);
  reportSaturday.setDate(reportSaturday.getDate() + (weekInMonth - 1) * 7);
  
  // ISO週番号を計算
  const dayOfWeek = reportSaturday.getDay();
  const daysFromSaturday = (dayOfWeek + 1) % 7;
  
  const weekStart = new Date(reportSaturday);
  weekStart.setDate(reportSaturday.getDate() - daysFromSaturday);
  
  const isoYear = weekStart.getFullYear();
  const firstDay = new Date(isoYear, 0, 1);
  const firstDayOfWeek = firstDay.getDay();
  const yearFirstSaturday = new Date(firstDay);
  const daysToFirstSaturday = (6 - firstDayOfWeek + 7) % 7;
  yearFirstSaturday.setDate(firstDay.getDate() + daysToFirstSaturday);
  
  const weekNumber = Math.floor((weekStart.getTime() - yearFirstSaturday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  return { year: isoYear, weekNumber };
}

// 週ラベル計算（recruitment-dashboard.tsxから）
function calculateWeekLabel(summary: any): string {
  const startDate = new Date(summary.weekInfo.startDate);
  const month = startDate.getMonth() + 1;
  const firstDayOfMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const firstSaturday = new Date(firstDayOfMonth);
  
  // その月の最初の土曜日を見つける
  while (firstSaturday.getDay() !== 6) {
    firstSaturday.setDate(firstSaturday.getDate() + 1);
  }
  
  // 週開始日が最初の土曜日から何週目かを計算
  const daysDiff = Math.floor((startDate.getTime() - firstSaturday.getTime()) / (1000 * 60 * 60 * 24));
  const weekInMonth = Math.floor(daysDiff / 7) + 1;
  
  // 表示用の月週を計算（6月1W形式）
  return `${month}月${Math.max(1, weekInMonth)}W`;
}

async function debugWeekAlignment() {
  console.log('🔍 採用活動の週ずれ問題調査を開始します\n');

  // テストケース定義
  const testCases: WeekTestCase[] = [
    { name: '6月1週', year: 2025, month: 6, weekInMonth: 1, expectedWeekLabel: '6月1W' },
    { name: '6月2週', year: 2025, month: 6, weekInMonth: 2, expectedWeekLabel: '6月2W' },
    { name: '6月3週', year: 2025, month: 6, weekInMonth: 3, expectedWeekLabel: '6月3W' },
    { name: '6月4週', year: 2025, month: 6, weekInMonth: 4, expectedWeekLabel: '6月4W' },
    { name: '5月4週', year: 2025, month: 5, weekInMonth: 4, expectedWeekLabel: '5月4W' },
  ];

  console.log('📋 Phase 1: 週計算ロジックの検証\n');

  for (const testCase of testCases) {
    console.log(`--- ${testCase.name}のテスト ---`);
    
    // 1. 期間選択からISO週番号への変換
    const isoWeek = convertPeriodSelectionToISOWeek(testCase.year, testCase.month, testCase.weekInMonth);
    console.log(`期間選択: ${testCase.year}年${testCase.month}月${testCase.weekInMonth}週`);
    console.log(`→ ISO週番号: ${isoWeek.year}-W${isoWeek.weekNumber}`);
    
    // 2. getWeekRange関数での週範囲計算
    const specificDate = new Date(testCase.year, testCase.month - 1, testCase.weekInMonth * 7);
    const weekRange = getWeekRange(specificDate);
    console.log(`週範囲計算: ${weekRange.startDate} 〜 ${weekRange.endDate} (${weekRange.year}-W${weekRange.weekNumber})`);
    
    // 3. APIからデータを取得してみる
    try {
      const db = getAdminDb();
      const weekKey = `${isoWeek.year}-W${isoWeek.weekNumber.toString().padStart(2, '0')}`;
      const doc = await db.collection('optimized_weekly_summaries').doc(weekKey).get();
      
      if (doc.exists) {
        const data = doc.data();
        console.log(`Firestoreデータ: 存在 (${weekKey})`);
        console.log(`データの期間: ${data?.startDate} 〜 ${data?.endDate}`);
        
        // 週ラベル計算
        const mockSummary = {
          weekInfo: {
            startDate: data?.startDate,
            endDate: data?.endDate
          }
        };
        const calculatedLabel = calculateWeekLabel(mockSummary);
        console.log(`計算された週ラベル: ${calculatedLabel}`);
        console.log(`期待値: ${testCase.expectedWeekLabel}`);
        console.log(`一致: ${calculatedLabel === testCase.expectedWeekLabel ? '✅' : '❌'}`);
        
        if (data?.totals?.bySource?.indeed?.applications || data?.totals?.bySource?.engage?.applications) {
          console.log(`応募数データ: indeed=${data.totals.bySource.indeed?.applications || 0}, engage=${data.totals.bySource.engage?.applications || 0}`);
        } else {
          console.log('応募数データ: なし');
        }
      } else {
        console.log(`Firestoreデータ: 存在しない (${weekKey})`);
      }
    } catch (error) {
      console.log(`データ取得エラー: ${error}`);
    }
    
    console.log('');
  }

  console.log('📋 Phase 2: 実際のAPI呼び出しテスト\n');

  // 実際のAPI呼び出しをシミュレート
  const targetCase = testCases[2]; // 6月3週をテスト
  console.log(`${targetCase.name}でのAPI呼び出しシミュレーション`);
  
  const isoWeek = convertPeriodSelectionToISOWeek(targetCase.year, targetCase.month, targetCase.weekInMonth);
  
  // 過去4週分のAPI呼び出しをシミュレート
  for (let i = 3; i >= 0; i--) {
    let weekNum = isoWeek.weekNumber - i;
    let year = isoWeek.year;

    // 年をまたぐ場合の処理
    if (weekNum <= 0) {
      year = isoWeek.year - 1;
      weekNum = 52 + weekNum;
    }

    console.log(`API呼び出し ${3-i+1}/4: ${year}-W${weekNum} (${i}週前)`);
    
    try {
      const db = getAdminDb();
      const weekKey = `${year}-W${weekNum.toString().padStart(2, '0')}`;
      const doc = await db.collection('optimized_weekly_summaries').doc(weekKey).get();
      
      if (doc.exists) {
        const data = doc.data();
        const mockSummary = {
          weekInfo: {
            startDate: data?.startDate,
            endDate: data?.endDate
          }
        };
        const weekLabel = calculateWeekLabel(mockSummary);
        console.log(`  → データ存在: ${weekLabel} (${data?.startDate} 〜 ${data?.endDate})`);
      } else {
        console.log(`  → データなし`);
      }
    } catch (error) {
      console.log(`  → エラー: ${error}`);
    }
  }

  console.log('\n📋 Phase 3: 不採用データの確認\n');

  try {
    const db = getAdminDb();
    
    // 応募データの実態確認（最新100件）
    const applicationsSnapshot = await db.collection('applications')
      .orderBy('applicationDate', 'desc')
      .limit(100)
      .get();

    console.log(`応募データ総数: ${applicationsSnapshot.size}件`);

    const statusCounts: { [key: string]: number } = {};
    const rejectionReasonCounts: { [key: string]: number } = {};
    
    applicationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status || '未設定';
      const rejectionReason = data.rejectionReason || '未設定';
      
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      if (status.includes('不採用') || status.includes('落ち')) {
        rejectionReasonCounts[rejectionReason] = (rejectionReasonCounts[rejectionReason] || 0) + 1;
      }
    });

    console.log('\nステータス分布:');
    Object.entries(statusCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count}件`);
      });

    console.log('\n不採用理由分布:');
    Object.entries(rejectionReasonCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([reason, count]) => {
        console.log(`  ${reason}: ${count}件`);
      });

  } catch (error) {
    console.log(`データ確認エラー: ${error}`);
  }

  console.log('\n🎯 調査完了\n');
  console.log('結果は上記の出力を確認してください。');
  console.log('問題が見つかった場合は、docs/RECRUITMENT_DEBUGGING_COMPREHENSIVE_TODO.mdの該当項目を更新してください。');
}

// スクリプト実行
debugWeekAlignment().catch(console.error); 