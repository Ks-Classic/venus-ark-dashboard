// 8月2週目を基準とした週計算をデバッグするスクリプト

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

function getWeekNumberFromWeekStart(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  
  // 週の開始日が属する月と年
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1; // 1-12
  
  // その月の1日を含む週の開始日（土曜日）を求める
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeek = firstDayOfMonth.getUTCDay();
  const firstWeekStartDateOfMonth = new Date(firstDayOfMonth);
  firstWeekStartDateOfMonth.setUTCDate(1 - ((firstDayOfWeek + 1) % 7));
  
  // 基準週の開始日と、月初の週の開始日の差から、月内週番号を計算
  const diffTime = d.getTime() - firstWeekStartDateOfMonth.getTime();
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

// 日付をフォーマットする関数
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// 8月2週目を基準とした週計算をシミュレート
console.log('=== 8月2週目を基準とした週計算 ===');

// 8月2週目の基準土曜日を計算
const year = 2025;
const month = 8;
const week = 2;

// 月の1日を含む週を第1週とするロジック（月またぎ対応）
const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
const firstDayOfWeek = firstDayOfMonth.getDay();

// 月の1日を含む週の土曜日を見つける
let daysToFirstSaturday;
if (firstDayOfWeek === 6) {
  daysToFirstSaturday = 0;
} else {
  daysToFirstSaturday = -(firstDayOfWeek + 1);
}

// 月の1日を含む週の土曜日（第1週の開始日）
const firstWeekStart = new Date(firstDayOfMonth);
firstWeekStart.setUTCDate(firstDayOfMonth.getUTCDate() + daysToFirstSaturday);

// 指定された月内週の土曜日を計算
const targetSaturday = new Date(firstWeekStart);
targetSaturday.setUTCDate(firstWeekStart.getUTCDate() + (week - 1) * 7);

console.log(`8月2週目の基準土曜日: ${formatDate(targetSaturday)}`);

// 前後2週間ずつを取得
const weekOffsets = [-2, -1, 0, 1, 2];
let validWeekCount = 0;
const maxWeeks = 4;

console.log('\n=== 週計算の詳細 ===');
for (let i = 0; i < weekOffsets.length && validWeekCount < maxWeeks; i++) {
  const offset = weekOffsets[i];
  const weekSaturday = new Date(targetSaturday);
  weekSaturday.setUTCDate(targetSaturday.getUTCDate() + offset * 7);
  
  const weekStart = new Date(weekSaturday);
  const weekEnd = new Date(weekSaturday);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  
  // 週ラベルを生成
  const weekStartMonth = weekStart.getUTCMonth() + 1;
  const weekStartWeekInfo = getWeekNumberFromWeekStart(weekStart);
  const weekInMonth = weekStartWeekInfo.weekInMonth;
  
  const weekLabel = `${weekStartMonth}月${weekInMonth}W`;
  
  // 月またぎの週かどうかをチェック
  const isCrossMonth = isCrossMonthWeek(weekStartWeekInfo.year, weekStartMonth, weekInMonth);
  
  console.log(`週 ${i + 1} (offset: ${offset}):`);
  console.log(`  開始日: ${formatDate(weekStart)}`);
  console.log(`  終了日: ${formatDate(weekEnd)}`);
  console.log(`  週ラベル: ${weekLabel}`);
  console.log(`  月またぎ: ${isCrossMonth ? 'はい' : 'いいえ'}`);
  
  if (isCrossMonth) {
    console.log(`  → 月またぎの週のためスキップ`);
  } else {
    console.log(`  → 有効な週として追加 (${validWeekCount + 1}番目)`);
    validWeekCount++;
  }
  console.log('');
}

// 7月4Wの詳細を確認
console.log('=== 7月4Wの詳細確認 ===');
const july4Week = getWeekDateRange(2025, 7, 4);
console.log(`7月4Wの開始日: ${formatDate(july4Week.start)}`);
console.log(`7月4Wの終了日: ${formatDate(july4Week.end)}`);

// 8月2週目の前2週目が7月4Wと一致するかチェック
const august2Week = getWeekDateRange(2025, 8, 2);
const august2WeekStart = new Date(august2Week.start);
august2WeekStart.setUTCDate(august2WeekStart.getUTCDate() - 14); // 前2週

console.log(`8月2週目の前2週目の開始日: ${formatDate(august2WeekStart)}`);
console.log(`7月4Wの開始日と一致: ${formatDate(july4Week.start) === formatDate(august2WeekStart)}`);
