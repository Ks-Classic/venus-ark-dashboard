// 修正したgetValidWeeksInMonth関数をテストするスクリプト

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

function isCrossMonthWeek(year, month, weekInMonth) {
  // 指定された週の開始日を取得
  const { start: weekStart } = getWeekDateRange(year, month, weekInMonth);
  
  // 週の開始日（土曜日）が属する月を取得
  const weekStartMonth = weekStart.getUTCMonth() + 1;
  
  // 指定された月と週の開始日が属する月が異なる場合は月またぎ
  return weekStartMonth !== month;
}

function getValidWeeksInMonth(year, month) {
  // その月の最終日を取得
  const lastDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  lastDayOfMonth.setUTCMonth(lastDayOfMonth.getUTCMonth() + 1);
  lastDayOfMonth.setUTCDate(0); // これでその月の最終日になる
  
  // その月の1日を含む週の開始日（土曜日）を求める
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeek = firstDayOfMonth.getUTCDay();
  const firstWeekStartDate = new Date(firstDayOfMonth);
  firstWeekStartDate.setUTCDate(1 - ((firstDayOfWeek + 1) % 7));
  
  // その月の最終日を含む週の開始日（土曜日）を求める
  const lastDayOfWeek = lastDayOfMonth.getUTCDay();
  const lastWeekStartDate = new Date(lastDayOfMonth);
  lastWeekStartDate.setUTCDate(lastDayOfMonth.getUTCDate() - ((lastDayOfWeek + 1) % 7));
  
  // 週数を計算（最大5週まで）
  const diffTime = lastWeekStartDate.getTime() - firstWeekStartDate.getTime();
  const calculatedWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
  const maxWeeks = Math.min(calculatedWeeks, 5); // 最大5週までに制限
  
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

// 8月の有効な週をテスト
console.log('=== 修正後の8月の有効な週 ===');
const augustValidWeeks = getValidWeeksInMonth(2025, 8);
console.log('8月の有効な週:', augustValidWeeks);

// 8月の各週の詳細を表示
console.log('\n=== 8月の各週の詳細 ===');
for (let week = 1; week <= 5; week++) {
  const { start, end } = getWeekDateRange(2025, 8, week);
  const isCrossMonth = isCrossMonthWeek(2025, 8, week);
  console.log(`8月${week}週目: ${formatDate(start)} ~ ${formatDate(end)} ${isCrossMonth ? '(月またぎ)' : ''}`);
}

// 他の月もテスト
console.log('\n=== 他の月の有効な週 ===');
const testMonths = [1, 2, 7, 12];
testMonths.forEach(month => {
  const validWeeks = getValidWeeksInMonth(2025, month);
  console.log(`${month}月の有効な週:`, validWeeks);
});
