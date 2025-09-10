// 週選択の問題をデバッグするスクリプト

// 週計算ロジック（JavaScript版）
function getWeekDateRange(year, month, weekInMonth) {
  // その月の1日を取得
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeek = firstDayOfMonth.getUTCDay(); // 0:Sun, 6:Sat

  // その月の1日を含む週の開始日（土曜日）を計算
  const daysToSubtract = (firstDayOfWeek + 1) % 7;
  const firstWeekStartDate = new Date(firstDayOfMonth);
  firstWeekStartDate.setUTCDate(1 - daysToSubtract);

  // 目的の週の開始日（土曜日）を計算
  const targetWeekStartDate = new Date(firstWeekStartDate);
  targetWeekStartDate.setUTCDate(firstWeekStartDate.getUTCDate() + (weekInMonth - 1) * 7);

  const start = targetWeekStartDate;
  const end = new Date(targetWeekStartDate);
  end.setUTCDate(targetWeekStartDate.getUTCDate() + 6);

  return { start, end };
}

function getWeekNumberFromDate(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  // 1. 基準日を含む週の開始日（土曜日）を求める
  const dayOfWeek = d.getUTCDay(); // 0:Sun, 6:Sat
  const weekStartDate = new Date(d);
  weekStartDate.setUTCDate(d.getUTCDate() - ((dayOfWeek + 1) % 7));

  // 2. 週が属する年と月を、週の中心である火曜日から決定する
  const tuesday = new Date(weekStartDate);
  tuesday.setUTCDate(weekStartDate.getUTCDate() + 3);
  const year = tuesday.getUTCFullYear();
  const month = tuesday.getUTCMonth() + 1; // 1-12

  // 3. 決定した月の1日を含む週の開始日（土曜日）を求める
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeekInMonth = firstDayOfMonth.getUTCDay();
  const firstWeekStartDateOfMonth = new Date(firstDayOfMonth);
  firstWeekStartDateOfMonth.setUTCDate(1 - ((firstDayOfWeekInMonth + 1) % 7));

  // 4. 基準週の開始日と、月初の週の開始日の差から、月内週番号を計算
  const diffTime = weekStartDate.getTime() - firstWeekStartDateOfMonth.getTime();
  const weekInMonth = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;

  return { year, month, weekInMonth };
}

function isCrossMonthWeek(year, month, weekInMonth) {
  // 指定された週の開始日を取得
  const { start: weekStart } = getWeekDateRange(year, month, weekInMonth);
  
  // 週の開始日（土曜日）が属する月を取得
  const weekStartMonth = weekStart.getUTCMonth() + 1;
  
  // 指定された月と週の開始日が属する月が異なる場合は月またぎ
  return weekStartMonth !== month;
}

function getValidWeeksInMonth(year, month) {
  // 簡易的な週数計算（実際の実装ではgetWeeksInMonthを使用）
  const maxWeeks = 5; // 最大5週と仮定
  const validWeeks = [];
  
  for (let week = 1; week <= maxWeeks; week++) {
    // 月またぎの週でない場合のみ追加
    if (!isCrossMonthWeek(year, month, week)) {
      validWeeks.push(week);
    }
  }
  
  return validWeeks;
}

// 日付をフォーマットする関数
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// 現在の日付の週情報を確認
console.log('=== 現在の日付の週情報 ===');
const now = new Date();
console.log('現在の日付:', formatDate(now));
const currentWeekInfo = getWeekNumberFromDate(now);
console.log('現在の週情報:', currentWeekInfo);

// 8月の有効な週を確認
console.log('\n=== 8月の有効な週 ===');
const augustValidWeeks = getValidWeeksInMonth(2025, 8);
console.log('8月の有効な週:', augustValidWeeks);

// 現在の週が8月の有効な週に含まれているかチェック
console.log('\n=== 週選択の妥当性チェック ===');
console.log('現在の週情報:', currentWeekInfo);
console.log('8月の有効な週:', augustValidWeeks);
console.log('現在の週が8月の有効な週に含まれているか:', augustValidWeeks.includes(currentWeekInfo.weekInMonth));

// 8月の各週の詳細を表示
console.log('\n=== 8月の各週の詳細 ===');
for (let week = 1; week <= 5; week++) {
  const { start, end } = getWeekDateRange(2025, 8, week);
  const isCrossMonth = isCrossMonthWeek(2025, 8, week);
  console.log(`8月${week}週目: ${formatDate(start)} ~ ${formatDate(end)} ${isCrossMonth ? '(月またぎ)' : ''}`);
}

// 初期化時の問題をシミュレート
console.log('\n=== 初期化シミュレーション ===');
console.log('usePeriodSelectionの初期値:');
console.log('  selectedYear:', currentWeekInfo.year);
console.log('  selectedMonth:', currentWeekInfo.month);
console.log('  selectedWeekInMonth:', currentWeekInfo.weekInMonth);

// 8月を選択した場合の動作
console.log('\n8月を選択した場合:');
const validWeeks = getValidWeeksInMonth(2025, 8);
console.log('  有効な週:', validWeeks);
console.log('  デフォルトで選択される週:', validWeeks[0]);
