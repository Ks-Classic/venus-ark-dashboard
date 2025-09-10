// 週番号計算の違いをデバッグするスクリプト

// UI側の計算方式（月ベース）
function calculateMonthBasedWeek(year: number, month: number, weekInMonth: number) {
  // その月の第N週の土曜日を計算
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const firstSaturday = new Date(firstDayOfMonth);
  while (firstSaturday.getDay() !== 6) {
    firstSaturday.setDate(firstSaturday.getDate() + 1);
  }
  
  const reportSaturday = new Date(firstSaturday);
  reportSaturday.setDate(reportSaturday.getDate() + (weekInMonth - 1) * 7);
  
  // 集計期間は前週土曜日から金曜日まで
  const periodStart = new Date(reportSaturday);
  periodStart.setDate(periodStart.getDate() - 7);
  
  const periodEnd = new Date(reportSaturday);
  periodEnd.setDate(periodEnd.getDate() - 1); // 金曜日
  
  return {
    reportSaturday,
    periodStart,
    periodEnd,
    startStr: `${periodStart.getMonth() + 1}/${periodStart.getDate()}`,
    endStr: `${periodEnd.getMonth() + 1}/${periodEnd.getDate()}`
  };
}

// API側の計算方式（ISO週番号）
function calculateISOWeek(date: Date): { year: number; weekNumber: number } {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  
  // 土曜日を週の開始とするため、土曜日からの経過日数を計算
  const daysFromSaturday = (dayOfWeek + 1) % 7;
  
  // 週の開始日（土曜日）を計算
  const weekStart = new Date(targetDate);
  weekStart.setDate(targetDate.getDate() - daysFromSaturday);
  
  // 年と週番号を計算
  const year = weekStart.getFullYear();
  const firstDay = new Date(year, 0, 1);
  const firstDayOfWeek = firstDay.getDay();
  const firstSaturday = new Date(firstDay);
  const daysToFirstSaturday = (6 - firstDayOfWeek + 7) % 7;
  firstSaturday.setDate(firstDay.getDate() + daysToFirstSaturday);
  
  const weekNumber = Math.floor((weekStart.getTime() - firstSaturday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  return { year, weekNumber };
}

// 期間選択パラメータを変換する関数
function convertPeriodSelectionToISOWeek(year: number, month: number, weekInMonth: number) {
  const monthWeek = calculateMonthBasedWeek(year, month, weekInMonth);
  const isoWeek = calculateISOWeek(monthWeek.reportSaturday);
  
  return {
    monthBased: {
      year,
      month,
      weekInMonth,
      reportSaturday: monthWeek.reportSaturday,
      periodStart: monthWeek.periodStart,
      periodEnd: monthWeek.periodEnd,
      startStr: monthWeek.startStr,
      endStr: monthWeek.endStr
    },
    isoBased: isoWeek
  };
}

// デバッグ実行
console.log('=== 週番号計算デバッグ ===');

// 6月3週の場合
const result = convertPeriodSelectionToISOWeek(2025, 6, 3);

console.log('\n📅 6月3週の計算結果:');
console.log('月ベース計算:');
console.log(`  報告日（土曜日）: ${result.monthBased.reportSaturday.toLocaleDateString('ja-JP')}`);
console.log(`  集計期間: ${result.monthBased.startStr} - ${result.monthBased.endStr}`);
console.log(`  期間開始: ${result.monthBased.periodStart.toLocaleDateString('ja-JP')}`);
console.log(`  期間終了: ${result.monthBased.periodEnd.toLocaleDateString('ja-JP')}`);

console.log('\nISO週番号計算:');
console.log(`  年: ${result.isoBased.year}`);
console.log(`  週番号: ${result.isoBased.weekNumber}`);

// 他の週も確認
console.log('\n=== 他の週の確認 ===');
for (let week = 1; week <= 4; week++) {
  const weekResult = convertPeriodSelectionToISOWeek(2025, 6, week);
  console.log(`6月${week}週 → ISO: ${weekResult.isoBased.year}-W${weekResult.isoBased.weekNumber} (${weekResult.monthBased.startStr}-${weekResult.monthBased.endStr})`);
}

// 逆引き確認: API側の週番号22-25が月ベースでは何週に相当するか
console.log('\n=== 逆引き確認（API側週番号 → 月ベース） ===');
for (let isoWeek = 22; isoWeek <= 25; isoWeek++) {
  // ISO週番号から日付を逆算
  const year = 2025;
  const firstDay = new Date(year, 0, 1);
  const firstDayOfWeek = firstDay.getDay();
  const firstSaturday = new Date(firstDay);
  const daysToFirstSaturday = (6 - firstDayOfWeek + 7) % 7;
  firstSaturday.setDate(firstDay.getDate() + daysToFirstSaturday);
  
  const weekStart = new Date(firstSaturday);
  weekStart.setDate(firstSaturday.getDate() + (isoWeek - 1) * 7);
  
  const month = weekStart.getMonth() + 1;
  const day = weekStart.getDate();
  
  console.log(`ISO 2025-W${isoWeek} → ${month}月${day}日(土)開始`);
}

export { convertPeriodSelectionToISOWeek }; 