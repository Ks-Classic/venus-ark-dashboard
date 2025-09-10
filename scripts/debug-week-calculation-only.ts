#!/usr/bin/env npx tsx
/**
 * Firebase接続なしで週計算ロジックの検証を行うスクリプト
 */

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

// getWeekRange関数（lib/analytics/weekly-aggregation.tsから）
function getWeekRange(date: Date): { startDate: string; endDate: string; weekNumber: number; year: number } {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay(); // 0=日曜日, 6=土曜日
  
  // 土曜日を週の開始とするため、土曜日からの経過日数を計算
  const daysFromSaturday = (dayOfWeek + 1) % 7; // 土曜日=0, 日曜日=1, ..., 金曜日=6
  
  // 週の開始日（土曜日）を計算
  const startDate = new Date(targetDate);
  startDate.setDate(targetDate.getDate() - daysFromSaturday);
  
  // 週の終了日（金曜日）を計算
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  // 年と週番号を計算（年は週の開始日の年を使用）
  const year = startDate.getFullYear();
  const weekNumber = getWeekNumberOfYear(startDate);
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    weekNumber,
    year
  };
}

// 年内での週番号を計算する（土曜日開始）
function getWeekNumberOfYear(date: Date): number {
  const year = date.getFullYear();
  const firstDay = new Date(year, 0, 1);
  const firstDayOfWeek = firstDay.getDay();
  
  // その年の最初の土曜日を計算
  const firstSaturday = new Date(firstDay);
  const daysToFirstSaturday = (6 - firstDayOfWeek + 7) % 7;
  firstSaturday.setDate(firstDay.getDate() + daysToFirstSaturday);
  
  // 対象日が最初の土曜日より前の場合は第1週とする
  if (date < firstSaturday) {
    return 1;
  }
  
  // 最初の土曜日からの経過日数を計算
  const diffTime = date.getTime() - firstSaturday.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // 週番号を計算（1から開始）
  return Math.floor(diffDays / 7) + 1;
}

// 日付をYYYY-MM-DD形式でフォーマット
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 週ラベル計算（recruitment-dashboard.tsxから）
function calculateWeekLabel(startDate: string): string {
  const start = new Date(startDate);
  const month = start.getMonth() + 1;
  const firstDayOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const firstSaturday = new Date(firstDayOfMonth);
  
  // その月の最初の土曜日を見つける
  while (firstSaturday.getDay() !== 6) {
    firstSaturday.setDate(firstSaturday.getDate() + 1);
  }
  
  // 週開始日が最初の土曜日から何週目かを計算
  const daysDiff = Math.floor((start.getTime() - firstSaturday.getTime()) / (1000 * 60 * 60 * 24));
  const weekInMonth = Math.floor(daysDiff / 7) + 1;
  
  // 表示用の月週を計算（6月1W形式）
  return `${month}月${Math.max(1, weekInMonth)}W`;
}

function debugWeekCalculation() {
  console.log('🔍 週計算ロジックの検証（Firebase接続なし）\n');

  // テストケース定義
  const testCases: WeekTestCase[] = [
    { name: '6月1週', year: 2025, month: 6, weekInMonth: 1, expectedWeekLabel: '6月1W' },
    { name: '6月2週', year: 2025, month: 6, weekInMonth: 2, expectedWeekLabel: '6月2W' },
    { name: '6月3週', year: 2025, month: 6, weekInMonth: 3, expectedWeekLabel: '6月3W' },
    { name: '6月4週', year: 2025, month: 6, weekInMonth: 4, expectedWeekLabel: '6月4W' },
    { name: '5月4週', year: 2025, month: 5, weekInMonth: 4, expectedWeekLabel: '5月4W' },
  ];

  console.log('📋 Phase 1: 期間選択からISO週番号への変換テスト\n');

  for (const testCase of testCases) {
    console.log(`--- ${testCase.name} ---`);
    
    // 1. 期間選択からISO週番号への変換
    const isoWeek = convertPeriodSelectionToISOWeek(testCase.year, testCase.month, testCase.weekInMonth);
    console.log(`期間選択: ${testCase.year}年${testCase.month}月${testCase.weekInMonth}週`);
    console.log(`→ ISO週番号: ${isoWeek.year}-W${isoWeek.weekNumber}`);
    
    // 2. その週の土曜日を計算（期間選択ロジック）
    const firstDayOfMonth = new Date(testCase.year, testCase.month - 1, 1);
    const firstSaturday = new Date(firstDayOfMonth);
    while (firstSaturday.getDay() !== 6) {
      firstSaturday.setDate(firstSaturday.getDate() + 1);
    }
    const reportSaturday = new Date(firstSaturday);
    reportSaturday.setDate(reportSaturday.getDate() + (testCase.weekInMonth - 1) * 7);
    
    console.log(`月初: ${formatDate(firstDayOfMonth)}`);
    console.log(`月の最初の土曜日: ${formatDate(firstSaturday)}`);
    console.log(`第${testCase.weekInMonth}週の土曜日: ${formatDate(reportSaturday)}`);
    
    // 3. getWeekRange関数での週範囲計算
    const weekRange = getWeekRange(reportSaturday);
    console.log(`週範囲: ${weekRange.startDate} 〜 ${weekRange.endDate} (${weekRange.year}-W${weekRange.weekNumber})`);
    
    // 4. 週ラベル計算
    const calculatedLabel = calculateWeekLabel(weekRange.startDate);
    console.log(`計算された週ラベル: ${calculatedLabel}`);
    console.log(`期待値: ${testCase.expectedWeekLabel}`);
    console.log(`一致: ${calculatedLabel === testCase.expectedWeekLabel ? '✅' : '❌'}`);
    
    // ISO週番号の一致確認
    console.log(`ISO週番号一致: ${isoWeek.weekNumber === weekRange.weekNumber ? '✅' : '❌'}`);
    
    console.log('');
  }

  console.log('📋 Phase 2: 具体的な日付での検証\n');

  // 2025年6月の実際の日付を確認
  console.log('2025年6月のカレンダー確認:');
  const june2025 = new Date(2025, 5, 1); // 6月1日
  console.log(`6月1日: ${formatDate(june2025)} (${['日', '月', '火', '水', '木', '金', '土'][june2025.getDay()]}曜日)`);
  
  // 6月の各週の土曜日を計算
  const firstSaturday = new Date(2025, 5, 1);
  while (firstSaturday.getDay() !== 6) {
    firstSaturday.setDate(firstSaturday.getDate() + 1);
  }
  
  for (let week = 1; week <= 4; week++) {
    const saturday = new Date(firstSaturday);
    saturday.setDate(firstSaturday.getDate() + (week - 1) * 7);
    
    const weekRange = getWeekRange(saturday);
    const weekLabel = calculateWeekLabel(weekRange.startDate);
    
    console.log(`6月${week}週: ${formatDate(saturday)} (土) → 週範囲 ${weekRange.startDate}〜${weekRange.endDate} → ラベル ${weekLabel}`);
  }

  console.log('\n📋 Phase 3: API呼び出しシミュレーション（6月3週）\n');

  const targetCase = testCases[2]; // 6月3週
  const isoWeek = convertPeriodSelectionToISOWeek(targetCase.year, targetCase.month, targetCase.weekInMonth);
  
  console.log(`選択: 6月3週`);
  console.log(`→ ISO週番号: ${isoWeek.year}-W${isoWeek.weekNumber}`);
  
  // 過去4週分のAPI呼び出しをシミュレート
  console.log('\n過去4週分のデータ取得シミュレーション:');
  for (let i = 3; i >= 0; i--) {
    let weekNum = isoWeek.weekNumber - i;
    let year = isoWeek.year;

    // 年をまたぐ場合の処理
    if (weekNum <= 0) {
      year = isoWeek.year - 1;
      weekNum = 52 + weekNum;
    }

    const apiWeekKey = `${year}-W${weekNum.toString().padStart(2, '0')}`;
    
    // その週の実際の日付範囲を逆算
    const firstDay = new Date(year, 0, 1);
    const firstDayOfWeek = firstDay.getDay();
    const yearFirstSaturday = new Date(firstDay);
    const daysToFirstSaturday = (6 - firstDayOfWeek + 7) % 7;
    yearFirstSaturday.setDate(firstDay.getDate() + daysToFirstSaturday);
    
    const weekStart = new Date(yearFirstSaturday);
    weekStart.setDate(yearFirstSaturday.getDate() + (weekNum - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const weekLabel = calculateWeekLabel(formatDate(weekStart));
    
    console.log(`${3-i+1}/4: ${apiWeekKey} → 日付範囲 ${formatDate(weekStart)}〜${formatDate(weekEnd)} → ラベル ${weekLabel}`);
  }

  console.log('\n🎯 検証結果まとめ\n');
  
  console.log('【問題点の可能性】:');
  console.log('1. 期間選択（6月3週）とISO週番号の変換');
  console.log('2. ISO週番号から実際の日付範囲への逆算');
  console.log('3. 日付範囲から表示用の週ラベル（6月3W）への変換');
  console.log('4. 過去4週のデータ取得順序と表示順序');
  
  console.log('\n【次のアクション】:');
  console.log('1. 上記の出力で一致しない項目を特定');
  console.log('2. docs/RECRUITMENT_DEBUGGING_COMPREHENSIVE_TODO.mdの該当項目を更新');
  console.log('3. 問題箇所の修正案を検討');
}

// スクリプト実行
debugWeekCalculation(); 