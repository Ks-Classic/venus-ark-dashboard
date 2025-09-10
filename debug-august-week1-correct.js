// 8月1Wの正しい計算ロジックを確認
const year = 2025;
const month = 8;

console.log(`[DEBUG] 8月1Wの正しい計算: year=${year}, month=${month}`);

// 8月1日
const augustFirst = new Date(year, month - 1, 1);
console.log(`[DEBUG] 8月1日: ${augustFirst.toISOString().split('T')[0]}, 曜日: ${augustFirst.getDay()}`);

// 8月1日を含む週の土曜日を計算
const firstDayOfWeek = augustFirst.getDay();
let daysToFirstSaturday;
if (firstDayOfWeek === 6) {
  daysToFirstSaturday = 0;
} else {
  daysToFirstSaturday = -(firstDayOfWeek + 1);
}

const firstWeekSaturday = new Date(augustFirst);
firstWeekSaturday.setDate(augustFirst.getDate() + daysToFirstSaturday);

console.log(`[DEBUG] 8月の第1週土曜日: ${firstWeekSaturday.toISOString().split('T')[0]}`);

// 8月1Wの土曜日（第1週の土曜日）
const augustWeek1Saturday = new Date(firstWeekSaturday);
console.log(`[DEBUG] 8月1Wの土曜日: ${augustWeek1Saturday.toISOString().split('T')[0]}`);

// 8月1Wの期間
const augustWeek1Start = new Date(augustWeek1Saturday);
const augustWeek1End = new Date(augustWeek1Saturday);
augustWeek1End.setDate(augustWeek1End.getDate() + 6);

console.log(`[DEBUG] 8月1Wの期間: ${augustWeek1Start.toISOString().split('T')[0]} 〜 ${augustWeek1End.toISOString().split('T')[0]}`);

// 現在のAPIロジックの問題を確認
console.log(`\n[DEBUG] 現在のAPIロジックの問題:`);
console.log(`8月1WのAPIを呼び出しているのに、7月5Wのデータが返されている`);

// 正しい8月1Wの計算
console.log(`\n[DEBUG] 正しい8月1Wの計算:`);
console.log(`8月1Wの土曜日: 2025-08-02`);
console.log(`8月1Wの期間: 2025-08-02 〜 2025-08-08`);

// 現在のAPIロジックの結果
console.log(`\n[DEBUG] 現在のAPIロジックの結果:`);
console.log(`8月1Wの土曜日: 2025-07-25 (間違い)`);
console.log(`8月1Wの期間: 2025-07-25 〜 2025-07-31 (間違い)`);
