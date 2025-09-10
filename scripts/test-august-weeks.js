// 8月の週の表示をテストするスクリプト

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

// 日付をフォーマットする関数
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// 8月の週をテスト
console.log('=== 8月の週テスト ===');
for (let week = 1; week <= 5; week++) {
  const { start, end } = getWeekDateRange(2025, 8, week);
  const weekInfo = getWeekNumberFromDate(start);
  const weekStartMonth = start.getUTCMonth() + 1;
  const weekStartWeekInfo = getWeekNumberFromWeekStart(start);
  
  console.log(`8月${week}週目:`);
  console.log(`  開始日: ${formatDate(start)} (${start.toLocaleDateString('ja-JP', { weekday: 'short' })})`);
  console.log(`  終了日: ${formatDate(end)} (${end.toLocaleDateString('ja-JP', { weekday: 'short' })})`);
  console.log(`  週の中心（火曜日）: ${weekInfo.month}月${weekInfo.weekInMonth}週目`);
  console.log(`  週の開始日が属する月: ${weekStartMonth}月`);
  console.log(`  週の開始日ベースの週番号: ${weekStartWeekInfo.month}月${weekStartWeekInfo.weekInMonth}週目`);
  console.log(`  表示されるラベル: ${weekStartMonth}月${weekStartWeekInfo.weekInMonth}W`);
  console.log('');
}

// 8月2週目を基準にした4週間のデータを生成（APIと同じロジック）
console.log('=== 8月2週目を基準にした4週間のデータ ===');
const targetSaturday = new Date(Date.UTC(2025, 7, 1)); // 8月1日
targetSaturday.setUTCDate(1 + 7); // 8月2週目の土曜日

const weekOffsets = [-2, -1, 0, 1, 2]; // 前2週、前1週、選択週、後1週、後2週
let validWeekCount = 0;
const maxWeeks = 4;

for (let i = 0; i < weekOffsets.length && validWeekCount < maxWeeks; i++) {
  const offset = weekOffsets[i];
  const weekSaturday = new Date(targetSaturday);
  weekSaturday.setUTCDate(targetSaturday.getUTCDate() + offset * 7);
  
  const weekStart = new Date(weekSaturday);
  const weekEnd = new Date(weekSaturday);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  
  const weekStartMonth = weekStart.getUTCMonth() + 1;
  const weekStartWeekInfo = getWeekNumberFromWeekStart(weekStart);
  const weekLabel = `${weekStartMonth}月${weekStartWeekInfo.weekInMonth}W`;
  
  console.log(`週 ${i + 1} (offset: ${offset}): ${weekLabel}, 開始: ${formatDate(weekStart)}, 終了: ${formatDate(weekEnd)}`);
  validWeekCount++;
}
