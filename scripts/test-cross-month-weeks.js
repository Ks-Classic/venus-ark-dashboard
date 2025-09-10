// 月またぎの週の処理をテストするスクリプト（JavaScript版）

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

// 週の情報を表示する関数
function displayWeekInfo(year, month, weekInMonth) {
  const { start, end } = getWeekDateRange(year, month, weekInMonth);
  const weekInfo = getWeekNumberFromDate(start);
  const isCrossMonth = isCrossMonthWeek(year, month, weekInMonth);
  
  console.log(`${year}年${month}月${weekInMonth}週目:`);
  console.log(`  開始日: ${formatDate(start)} (${start.toLocaleDateString('ja-JP', { weekday: 'short' })})`);
  console.log(`  終了日: ${formatDate(end)} (${end.toLocaleDateString('ja-JP', { weekday: 'short' })})`);
  console.log(`  週の中心（火曜日）: ${weekInfo.month}月${weekInfo.weekInMonth}週目`);
  console.log(`  月またぎ: ${isCrossMonth ? 'はい' : 'いいえ'}`);
  console.log('');
}

// 7月と8月の週をテスト
console.log('=== 7月の週テスト ===');
for (let week = 1; week <= 5; week++) {
  displayWeekInfo(2025, 7, week);
}

console.log('=== 8月の週テスト ===');
for (let week = 1; week <= 5; week++) {
  displayWeekInfo(2025, 8, week);
}

// 有効な週リストをテスト
console.log('=== 有効な週リストテスト ===');
console.log('7月の有効な週:', getValidWeeksInMonth(2025, 7));
console.log('8月の有効な週:', getValidWeeksInMonth(2025, 8));

// 他の月もテスト
console.log('=== 他の月のテスト ===');
const testMonths = [1, 2, 3, 4, 5, 6, 9, 10, 11, 12];
testMonths.forEach(month => {
  const validWeeks = getValidWeeksInMonth(2025, month);
  console.log(`${month}月の有効な週:`, validWeeks);
});
