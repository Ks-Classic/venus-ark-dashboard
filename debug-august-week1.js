// 8月1Wの計算ロジックをデバッグ
const year = 2025;
const month = 8;
const week = 1;

console.log(`[DEBUG] 8月1Wの計算: year=${year}, month=${month}, week=${week}`);

// 月の1日を含む週を第1週とするロジック（月またぎ対応）
const firstDayOfMonth = new Date(year, month - 1, 1);
const firstDayOfWeek = firstDayOfMonth.getDay();

console.log(`[DEBUG] 8月1日: ${firstDayOfMonth.toISOString().split('T')[0]}, 曜日: ${firstDayOfWeek} (0=日曜日, 6=土曜日)`);

// 月の1日を含む週の土曜日を見つける
let daysToFirstSaturday;
if (firstDayOfWeek === 6) {
  // 1日が土曜日の場合
  daysToFirstSaturday = 0;
} else {
  // 1日から前の土曜日までの日数（負の値）
  daysToFirstSaturday = -(firstDayOfWeek + 1);
}

console.log(`[DEBUG] 8月1日から最初の土曜日までの日数: ${daysToFirstSaturday}`);

// 月の1日を含む週の土曜日（第1週の開始日）
const firstWeekStart = new Date(firstDayOfMonth);
firstWeekStart.setDate(firstDayOfMonth.getDate() + daysToFirstSaturday);

console.log(`[DEBUG] 8月の第1週開始日（土曜日）: ${firstWeekStart.toISOString().split('T')[0]}`);

// 指定された月内週の土曜日を計算
const targetSaturday = new Date(firstWeekStart);
targetSaturday.setDate(targetSaturday.getDate() + (week - 1) * 7);

console.log(`[DEBUG] 8月${week}週目の土曜日: ${targetSaturday.toISOString().split('T')[0]}`);

// 4週間のデータを生成（選択週を3列目に配置: -2, -1, 0, +1）
for (let i = -2; i <= 1; i++) {
  const weekSaturday = new Date(targetSaturday);
  weekSaturday.setDate(weekSaturday.getDate() + i * 7);
  
  const weekStart = new Date(weekSaturday); // 土曜日開始
  const weekEnd = new Date(weekSaturday);
  weekEnd.setDate(weekEnd.getDate() + 6); // 金曜日終了
  
  const isPrediction = i === 1; // 翌週（予定）
  const isTarget = i === 0; // 選択週（3列目）
  
  // 週ラベルを生成（実際の日付に基づいて正確な月と週を計算）
  const weekDate = new Date(weekSaturday);
  const weekMonth = weekDate.getMonth() + 1; // 0ベースなので+1
  const weekYear = weekDate.getFullYear();
  
  // その月の週番号を正確に計算
  const firstDayOfWeekMonth = new Date(weekYear, weekDate.getMonth(), 1);
  const firstDayOfWeekMonthDay = firstDayOfWeekMonth.getDay();
  
  // 月の1日を含む週の土曜日を見つける
  let daysToFirstSaturday2;
  if (firstDayOfWeekMonthDay === 6) {
    daysToFirstSaturday2 = 0;
  } else {
    daysToFirstSaturday2 = -(firstDayOfWeekMonthDay + 1);
  }
  
  const firstWeekStartOfMonth = new Date(firstDayOfWeekMonth);
  firstWeekStartOfMonth.setDate(firstDayOfWeekMonth.getDate() + daysToFirstSaturday2);
  
  // 対象週がその月の何週目かを計算
  const diffInDays = Math.floor((weekDate.getTime() - firstWeekStartOfMonth.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumberInMonth = Math.floor(diffInDays / 7) + 1;
  
  // 1-5週の範囲に制限
  const adjustedWeekNumber = Math.max(1, Math.min(weekNumberInMonth, 5));
  
  const weekLabel = `${weekMonth}月${adjustedWeekNumber}W${isPrediction ? '(予定)' : ''}`;
  
  console.log(`[DEBUG] 週 ${i}: ${weekLabel}, 開始: ${weekStart.toISOString().split('T')[0]}, 終了: ${weekEnd.toISOString().split('T')[0]}, isTarget: ${isTarget}`);
  console.log(`[DEBUG] 週 ${i} 詳細: weekDate=${weekDate.toISOString().split('T')[0]}, weekMonth=${weekMonth}, weekNumberInMonth=${weekNumberInMonth}, adjustedWeekNumber=${adjustedWeekNumber}`);
}
