// =======================================================================
// 週計算ロジック (Dateオブジェクト版)
// ------------------------------------------------------------------------
// 週の定義：
// 1. 週は土曜日に始まり、金曜日に終わる。
// 2. 週が属する「月」は、週の7日間のうち「日数が多い月（多数決）」とする。
//    ※ 土曜開始～金曜終了のため、中心日の火曜日と一致しますが、厳密に多数決で判定します。
// 3. 月内週番号は、その月に「多数決で属する」週を時系列に並べた順で 1,2,3... と振る。
//    （従来の「その月の1日を含む週＝第1週」というルールから変更）
// =======================================================================

/**
 * 年、月、月内週番号から、その週の開始日（土）と終了日（金）を取得する
 * @param year 年
 * @param month 月 (1-12)
 * @param weekInMonth 月内週番号
 * @returns { start: Date, end: Date }
 */
export function getWeekDateRange(year: number, month: number, weekInMonth: number): { start: Date; end: Date } {
  const weeks = getWeeksAssignedToMonth(year, month);
  const idx = weekInMonth - 1;
  const target = weeks[idx] || weeks[weeks.length - 1];
  if (!target) {
    // フォールバック：安全のため、月初週（土曜）を計算
    const { start } = getFirstWeekStartCandidate(year, month);
    const fallbackStart = new Date(start);
    const fallbackEnd = new Date(start);
    fallbackEnd.setUTCDate(fallbackStart.getUTCDate() + 6);
    return { start: fallbackStart, end: fallbackEnd };
  }
  return target;
}

/**
 * 日付から、その週が「何年の何月の第何週か」を計算する
 * @param date 基準日
 * @returns { year, month, weekInMonth }
 */
export function getWeekNumberFromDate(date: Date): { year: number; month: number; weekInMonth: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekStartDate = getWeekStartFromAnyDate(d);
  const { year, month } = getAssignedMonthByMajority(weekStartDate);
  const weeks = getWeeksAssignedToMonth(year, month);
  const index = weeks.findIndex(w => w.start.getTime() === weekStartDate.getTime());
  const weekInMonth = index >= 0 ? index + 1 : 1;
  return { year, month, weekInMonth };
}

/**
 * 週の開始日（土曜日）が属する月で週番号を計算する
 * @param date 週の開始日（土曜日）
 * @returns { year: number, month: number, weekInMonth: number }
 */
export function getWeekNumberFromWeekStart(date: Date): { year: number; month: number; weekInMonth: number } {
  const weekStartDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const { year, month } = getAssignedMonthByMajority(weekStartDate);
  const weeks = getWeeksAssignedToMonth(year, month);
  const index = weeks.findIndex(w => w.start.getTime() === weekStartDate.getTime());
  const weekInMonth = index >= 0 ? index + 1 : 1;
  return { year, month, weekInMonth };
}

/**
 * 指定された年月に何週あるかを計算する
 * @param year 年
 * @param month 月 (1-12)
 * @returns その月の週数
 */
export function getWeeksInMonth(year: number, month: number): number {
  return getWeeksAssignedToMonth(year, month).length;
}

/**
 * 月またぎの週を判定する
 * @param year 年
 * @param month 月 (1-12)
 * @param weekInMonth 月内週番号
 * @returns 月またぎの週かどうか
 */
export function isCrossMonthWeek(year: number, month: number, weekInMonth: number): boolean {
  // 新ルールでは、各週は「多数決で属する月」に割り当てられ、
  // 本関数の呼び出し前提（year, month, weekInMonth がその割当）では常に false となる。
  // 互換のため残すが、利用側では本関数に依存しないことを推奨。
  return false;
}

/**
 * 月またぎの週をスキップした週リストを生成する
 * @param year 年
 * @param month 月 (1-12)
 * @returns 月またぎの週をスキップした週番号の配列
 */
export function getValidWeeksInMonth(year: number, month: number): number[] {
  const total = getWeeksAssignedToMonth(year, month).length;
  return Array.from({ length: total }, (_, i) => i + 1);
}

/**
 * 年、月、月内週番号から、YYYY-MM-WNN 形式の週識別キーを生成する
 * @param year 年
 * @param month 月 (1-12)
 * @param weekInMonth 月内週番号
 * @returns 週識別キー (例: "2024-07-W02")
 */
export function generateWeekKey(year: number, month: number, weekInMonth: number): string {
  return `${year}-${String(month).padStart(2, '0')}-W${String(weekInMonth).padStart(2, '0')}`;
}

/**
 * 年間週番号を計算する
 * @param date 基準日
 * @returns { year: number, weekInYear: number }
 */
export function getYearWeekNumber(date: Date): { year: number; weekInYear: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  // 1. 基準日を含む週の開始日（土曜日）を求める
  const dayOfWeek = d.getUTCDay(); // 0:Sun, 6:Sat
  const weekStartDate = new Date(d);
  weekStartDate.setUTCDate(d.getUTCDate() - ((dayOfWeek + 1) % 7));

  // 2. 週が属する年を、週の中心である火曜日から決定する
  const tuesday = new Date(weekStartDate);
  tuesday.setUTCDate(weekStartDate.getUTCDate() + 3);
  const year = tuesday.getUTCFullYear();

  // 3. 決定した年の1月1日を含む週の開始日（土曜日）を求める
  const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
  const firstDayOfWeekInYear = firstDayOfYear.getUTCDay();
  const firstWeekStartDateOfYear = new Date(firstDayOfYear);
  firstWeekStartDateOfYear.setUTCDate(1 - ((firstDayOfWeekInYear + 1) % 7));

  // 4. 基準週の開始日と、年始の週の開始日の差から、年間週番号を計算
  const diffTime = weekStartDate.getTime() - firstWeekStartDateOfYear.getTime();
  const weekInYear = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;

  return { year, weekInYear };
}

// ------------------------------------------------------------------------
// 内部ユーティリティ（新ルール実装）
// ------------------------------------------------------------------------

/**
 * 任意の日付が属する週（土曜開始）の開始日を取得
 */
function getWeekStartFromAnyDate(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = d.getUTCDay(); // 0:Sun ... 6:Sat
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - ((dayOfWeek + 1) % 7));
  return start;
}

/**
 * 多数決により、週の所属 年/月 を算出する
 * 返却: { year: YYYY, month: 1-12 }
 */
function getAssignedMonthByMajority(weekStart: Date): { year: number; month: number } {
  const counts = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1; // 1-12
    const key = `${y}-${m}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let maxKey = '';
  let maxCount = -1;
  for (const [key, cnt] of counts.entries()) {
    if (cnt > maxCount) {
      maxCount = cnt;
      maxKey = key;
    }
  }
  const [yearStr, monthStr] = maxKey.split('-');
  return { year: parseInt(yearStr, 10), month: parseInt(monthStr, 10) };
}

/**
 * 指定年月の「候補となる最初の週開始日（土曜）」を取得
 * （その月の1日を含む週の土曜）
 */
function getFirstWeekStartCandidate(year: number, month: number): { start: Date } {
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeek = firstDayOfMonth.getUTCDay();
  const daysToSaturday = (firstDayOfWeek + 1) % 7;
  const start = new Date(firstDayOfMonth);
  start.setUTCDate(1 - daysToSaturday);
  return { start };
}

/**
 * 指定の年月に「多数決で属する」週の一覧を、開始日・終了日で返す
 */
export function getWeeksAssignedToMonth(year: number, month: number): { start: Date; end: Date }[] {
  const { start: firstCandidate } = getFirstWeekStartCandidate(year, month);
  const weeks: { start: Date; end: Date }[] = [];
  // 最大6週分を走査（十分にカバーできる上限）
  for (let i = 0; i < 6; i++) {
    const start = new Date(firstCandidate);
    start.setUTCDate(firstCandidate.getUTCDate() + i * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    const assigned = getAssignedMonthByMajority(start);
    if (assigned.year === year && assigned.month === month) {
      weeks.push({ start, end });
    }
  }
  return weeks;
}
