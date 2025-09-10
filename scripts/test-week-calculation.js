// 月の1日を含む週を第1週とするロジック（月またぎ対応）
function getWeekDateRange(year, month, weekInMonth) {
  // 月の1日を取得 (monthは1ベース)
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  
  console.log(`[DEBUG] ${year}年${month}月1日: ${formatDate(firstDayOfMonth)} (${getDayOfWeek(firstDayOfMonth)})`);
  
  // 月の1日を含む週の土曜日を見つける
  let daysToFirstSaturday;
  if (firstDayOfWeek === 6) {
    // 1日が土曜日の場合
    daysToFirstSaturday = 0;
  } else {
    // 1日から前の土曜日までの日数（負の値）
    daysToFirstSaturday = -(firstDayOfWeek + 1);
  }
  
  const firstWeekStart = new Date(firstDayOfMonth);
  firstWeekStart.setDate(firstDayOfMonth.getDate() + daysToFirstSaturday);
  
  console.log(`[DEBUG] 月の1日を含む週の土曜日: ${formatDate(firstWeekStart)} (${getDayOfWeek(firstWeekStart)})`);
  
  // 指定された週の開始日（土曜日）を計算
  const start = new Date(firstWeekStart);
  start.setDate(firstWeekStart.getDate() + (weekInMonth - 1) * 7);
  
  // 終了日（金曜日）を計算
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return { start, end };
}

function formatDate(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

function getDayOfWeek(date) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
}

console.log('=== 2025年6月の週計算テスト（修正版：月の1日を含む週を第1週） ===');

// 手動で6月1日と関連日付を確認
const june1 = new Date(2025, 5, 1); // 6月1日
const may31 = new Date(2025, 4, 31); // 5月31日
const june14 = new Date(2025, 5, 14); // 6月14日

console.log('手動確認:');
console.log(`2025年5月31日: ${formatDate(may31)} (${getDayOfWeek(may31)})`);
console.log(`2025年6月1日: ${formatDate(june1)} (${getDayOfWeek(june1)})`);
console.log(`2025年6月14日: ${formatDate(june14)} (${getDayOfWeek(june14)})`);
console.log('');

for (let week = 1; week <= 4; week++) {
  console.log(`--- 6月${week}W の計算 ---`);
  const { start, end } = getWeekDateRange(2025, 6, week);
  console.log(`6月${week}W: ${formatDate(start)}(${getDayOfWeek(start)}) ～ ${formatDate(end)}(${getDayOfWeek(end)})`);
  console.log('');
}

console.log('\n=== 期待される正しい結果 ===');
console.log('6月1W: 2025-05-31(土) ～ 2025-06-06(金) - 6月1日を含む週');
console.log('6月2W: 2025-06-07(土) ～ 2025-06-13(金)');
console.log('6月3W: 2025-06-14(土) ～ 2025-06-20(金) ← ユーザーの期待');
console.log('6月4W: 2025-06-21(土) ～ 2025-06-27(金)');

console.log('\n=== 特定の日付の確認 ===');
console.log('2025-06-07:', getDayOfWeek(new Date(2025, 5, 7)), '曜日 (月の最初の土曜日)');
console.log('2025-06-14:', getDayOfWeek(new Date(2025, 5, 14)), '曜日');
console.log('2025-06-20:', getDayOfWeek(new Date(2025, 5, 20)), '曜日');
console.log('2025-06-21:', getDayOfWeek(new Date(2025, 5, 21)), '曜日'); 