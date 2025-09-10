/**
 * 採用活動 週別件数取得システム
 * 各シートのA列（応募日）から指定週の件数を取得
 * 週の範囲: 土曜日〜金曜日
 */

/**
 * メニューを作成
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('週別件数取得')
    .addItem('週を選択して件数取得', 'showWeeklySelector')
    .addItem('全週の件数を一覧表示', 'showAllWeeksCount')
    .addItem('詳細集計レポート', 'showDetailedReportDialog')
    .addToUi();
}

/**
 * 週選択UIを表示して件数を取得（プルダウン付き）
 */
function showWeeklySelector() {
  const ui = SpreadsheetApp.getUi();
  
  // 利用可能な週のリスト
  const weeks = [
    "7月4W", "7月5W", 
    "8月1W", "8月2W", "8月3W", "8月4W", "8月5W"
  ];
  
  // プルダウンメニューを作成
  const template = HtmlService.createTemplateFromFile('WeeklySelector');
  template.weeks = weeks;
  const html = template.evaluate()
    .setWidth(400)
    .setHeight(300);
  
  SpreadsheetApp.getUi().showModalDialog(html, '週を選択してください');
}

/**
 * 選択された週の件数を取得（HTMLから呼び出される）
 * @param {string} weekSelector - 週選択
 */
function processSelectedWeek(weekSelector) {
  try {
    const result = getWeeklyApplicationCount(weekSelector);
    
    // 結果を表示
    const ui = SpreadsheetApp.getUi();
    const message = `
週: ${result.week}
期間: ${result.dateRange}

${result.sheetResults.map(sheet => 
  `${sheet.name}: ${sheet.count}件`
).join('\n')}

合計: ${result.total}件
    `;
    
    ui.alert('週別件数結果', message, ui.ButtonSet.OK);
    
  } catch (e) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('エラー', 'エラーが発生しました: ' + e.message, ui.ButtonSet.OK);
  }
}

/**
 * 全週の件数を一覧表示
 */
function showAllWeeksCount() {
  const weeks = [
    "7月4W", "7月5W", 
    "8月1W", "8月2W", "8月3W", "8月4W", "8月5W"
  ];
  
  let result = '週別応募件数一覧\n\n';
  
  weeks.forEach(week => {
    try {
      const count = getWeeklyApplicationCount(week);
      result += `${week}: ${count.total}件\n`;
      count.sheetResults.forEach(sheet => {
        result += `  ${sheet.name}: ${sheet.count}件\n`;
      });
      result += '\n';
    } catch (e) {
      result += `${week}: エラー\n`;
    }
  });
  
  const ui = SpreadsheetApp.getUi();
  ui.alert('全週件数一覧', result, ui.ButtonSet.OK);
}

/**
 * 選択した週の応募件数を取得
 * @param {string} weekSelector - 週選択（例: "8月2W"）
 * @returns {Object} 各シートと合計の件数
 */
function getWeeklyApplicationCount(weekSelector) {
  // 週の日付範囲を計算
  const weekRange = getWeekDateRange(weekSelector);
  const startDate = weekRange.start;
  const endDate = weekRange.end;
  
  // スプレッドシートから全てのシートを取得
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = spreadsheet.getSheets();
  
  // 各シートの件数を取得
  const sheetResults = [];
  let totalCount = 0;
  
  sheets.forEach(sheet => {
    const sheetName = sheet.getName();
    const count = getSheetCount(sheetName, startDate, endDate);
    
    if (count > 0) { // 件数があるシートのみ追加
      sheetResults.push({
        name: sheetName,
        count: count
      });
      totalCount += count;
    }
  });
  
  return {
    week: weekSelector,
    dateRange: `${startDate} 〜 ${endDate}`,
    sheetResults: sheetResults,
    total: totalCount
  };
}

/**
 * 週の日付範囲を計算（土曜日〜金曜日）
 * @param {string} weekSelector - 週選択（例: "8月2W"）
 * @returns {Object} 開始日と終了日
 */
function getWeekDateRange(weekSelector) {
  // 例: "8月2W" → month: 8, week: 2
  const match = weekSelector.match(/(\d+)月(\d+)W/);
  if (!match) throw new Error('週選択の形式が正しくありません（例: 8月2W）');
  
  const month = parseInt(match[1]);
  const week = parseInt(match[2]);
  const year = 2025; // 固定または動的に取得
  
  // 月の最初の土曜日を基準に週を計算
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const firstSaturday = new Date(firstDayOfMonth);
  
  // 最初の土曜日まで進める
  while (firstSaturday.getDay() !== 6) { // 6 = 土曜日
    firstSaturday.setDate(firstSaturday.getDate() + 1);
  }
  
  // 指定週の土曜日を計算
  const targetSaturday = new Date(firstSaturday);
  targetSaturday.setDate(firstSaturday.getDate() + (week - 1) * 7);
  
  // 週の開始日（土曜日）と終了日（金曜日）
  const start = new Date(targetSaturday); // 土曜日
  const end = new Date(targetSaturday);
  end.setDate(targetSaturday.getDate() + 6); // 土曜日 + 6日 = 金曜日
  
  return {
    start: formatDate(start),
    end: formatDate(end)
  };
}

/**
 * 指定シートの指定期間の件数を取得
 * @param {string} sheetName - シート名
 * @param {string} startDate - 開始日
 * @param {string} endDate - 終了日
 * @returns {number} 件数
 */
function getSheetCount(sheetName, startDate, endDate) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return 0;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // A列（応募日）のインデックスを取得
  const dateColumnIndex = 0; // A列は0
  
  let count = 0;
  
  // ヘッダー行を除いて処理
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const dateValue = row[dateColumnIndex];
    
    if (dateValue && isValidDateInRange(dateValue, startDate, endDate)) {
      count++;
    }
  }
  
  return count;
}

/**
 * 日付が指定範囲内かチェック
 * @param {any} dateValue - チェックする日付
 * @param {string} startDate - 開始日
 * @param {string} endDate - 終了日
 * @returns {boolean} 範囲内かどうか
 */
function isValidDateInRange(dateValue, startDate, endDate) {
  try {
    const date = new Date(dateValue);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(date.getTime())) return false;
    
    return date >= start && date <= end;
  } catch (e) {
    return false;
  }
}

/**
 * 日付をフォーマット
 * @param {Date} date - 日付
 * @returns {string} フォーマットされた日付
 */
function formatDate(date) {
  return Utilities.formatDate(date, 'JST', 'yyyy/MM/dd');
}

/**
 * テスト用関数（デバッグ用）
 */
function testWeekCalculation() {
  console.log('8月2Wの日付範囲テスト:');
  const result = getWeekDateRange('8月2W');
  console.log('開始日（土曜）:', result.start);
  console.log('終了日（金曜）:', result.end);
  
  console.log('\n8月2Wの件数テスト:');
  const count = getWeeklyApplicationCount('8月2W');
  console.log('結果:', count);
}

/**
 * 詳細集計レポートダイアログを表示
 */
function showDetailedReportDialog() {
  const template = HtmlService.createTemplateFromFile('DetailedReportDialog');
  template.weeks = generateDialogWeeks();
  const html = template.evaluate()
    .setWidth(560)
    .setHeight(520);
  SpreadsheetApp.getUi().showModalDialog(html, '詳細集計レポート');
}

// 採用管理（職種別）→ 応募フォーム側のシート名マッピング
var FORM_SHEET_MAP = {
  'indeed応募者管理(動画編集)': ['動画_indeedその他経由'],
  'engageその他応募者管理(動画編集)': ['動画_indeedその他経由'],
  'indeed応募者管理(ライター/AIライター)': ['AIライター'],
  'engageその他応募者管理(ライター/AIライター)': ['AIライター'],
  'indeed応募者管理(撮影スタッフ)': ['動画撮影スタッフ_indeedその他経由'],
  'indeed応募者管理(SNS運用)': ['SNS運用_indeedその他経由'],
  'engageその他応募者管理(SNS運用)': ['SNS運用_indeedその他経由']
};

function getFormSheetNamesForRecruitmentSheet(sheetName) {
  const names = FORM_SHEET_MAP[sheetName] || [];
  // engage系は0扱い（将来名寄せで振り分け予定）
  if (sheetName && sheetName.includes('engage')) {
    return []; // 対象外
  }
  return names;
}

function isRecruitmentManagementSheetName(name) {
  if (!name) return false;
  if (name.includes('応募フォーム')) return false;
  if (name.includes('フォーム') && !name.includes('応募者管理')) return false;
  if (name.includes('全週レポート') || name.includes('採用集計')) return false;
  // 代表パターン or 明示マップのキーに一致
  if (FORM_SHEET_MAP[name]) return true;
  return name.includes('応募者管理');
}

/**
 * ダイアログ用: 直近12週の週セレクタを生成（例: "8月2W"）
 */
function generateDialogWeeks() {
  const weeks = [];
  const currentDate = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() - (i * 7));
    const month = d.getMonth() + 1;
    const weekInMonth = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 0).getDay()) / 7);
    weeks.push(`${month}月${weekInMonth}W`);
  }
  return weeks;
}

/**
 * ダイアログから呼び出し: 指定週の詳細集計を返す
 * @param {string} weekSelector - 例: "8月2W"
 */
function getDetailedWeeklyReport(weekSelector) {
  const weekRange = getWeekDateRange(weekSelector);
  const startDate = weekRange.start;
  const endDate = weekRange.end;
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = spreadsheet.getSheets();
  dbg('[DETAIL] getDetailedWeeklyReport start', { weekSelector: weekSelector, startDate: startDate, endDate: endDate, sheetCount: sheets.length });
  
  // このブック内の採用管理シートから対応するフォーム側シート名の集合を作成
  const formSheetSet = {};
  sheets.forEach(s => {
    getFormSheetNamesForRecruitmentSheet(s.getName()).forEach(n => formSheetSet[n] = true);
  });
  const targetFormSheets = Object.keys(formSheetSet);
  dbg('[DETAIL] targetFormSheets', targetFormSheets);
  
  // 応募フォーム（エントリーフォーム）のインデックスを構築（ターゲットのフォームシートに限定）
  const entryIndex = buildEntryFormTimestampIndex(targetFormSheets);
  dbg('[DETAIL] entryIndex keys', Object.keys(entryIndex).length);
  // 書類提出数は名寄せ不要のため、フォームのタイムスタンプ(A列)を直接集計
  const documentSubmitted = countFormSubmissionsInWeekDirect(startDate, endDate, targetFormSheets);
  dbg('[DETAIL] documentSubmitted (direct)', documentSubmitted);
  
  const perSheet = [];
  const totals = {
    applyCount: 0,
    applyRejectCount: 0,
    applyContinueCount: 0,
    interviewScheduled: 0,
    interviewConducted: 0,
    interviewCancelled: 0,
    hireCount: 0,
    offerAcceptedCount: 0,
    rejection: {
      experienced: 0,
      elderly: 0,
      unsuitable: 0,
      foreign: 0,
      declined: 0,
      other: 0
    },
    documentSubmitted: 0,
    documentRejectCount: 0,
    documentContinueCount: 0
  };
  
  sheets.filter(s => isRecruitmentManagementSheetName(s.getName())).forEach(sheet => {
    const metrics = getSheetDetailedMetrics(sheet, startDate, endDate, entryIndex);
    if (metrics.processedRows > 0) {
      perSheet.push({ sheet: sheet.getName(), ...metrics });
      totals.applyCount += metrics.applyCount;
      totals.applyRejectCount += metrics.applyRejectCount;
      totals.applyContinueCount += metrics.applyContinueCount;
      totals.documentSubmitted += metrics.documentSubmitted || 0;
      totals.interviewScheduled += metrics.interviewScheduled;
      totals.interviewConducted += metrics.interviewConducted;
      totals.interviewCancelled += metrics.interviewCancelled;
      totals.hireCount += metrics.hireCount;
      totals.offerAcceptedCount += metrics.offerAcceptedCount;
      // 不採用理由内訳
      totals.rejection.experienced += metrics.rejection.experienced;
      totals.rejection.elderly += metrics.rejection.elderly;
      totals.rejection.unsuitable += metrics.rejection.unsuitable;
      totals.rejection.foreign += metrics.rejection.foreign;
      totals.rejection.declined += metrics.rejection.declined;
      totals.rejection.other += metrics.rejection.other;
      // 書類不採用（フォーム基準）
      totals.documentRejectCount += metrics.documentRejectCount || 0;
    }
  });
  totals.documentContinueCount = Math.max(0, totals.documentSubmitted - totals.documentRejectCount);
  
  return {
    success: true,
    week: weekSelector,
    dateRange: `${startDate} 〜 ${endDate}`,
    totals: totals,
    perSheet: perSheet,
    debug: { logs: flushDebugLogs() }
  };
}

/**
 * 単一シートの詳細集計を実行
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} startDate
 * @param {string} endDate
 */
function getSheetDetailedMetrics(sheet, startDate, endDate, entryIndex) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { processedRows: 0, applyCount: 0, applyRejectCount: 0, applyContinueCount: 0, interviewScheduled: 0, interviewConducted: 0, interviewCancelled: 0, hireCount: 0, offerAcceptedCount: 0, documentSubmitted: 0, documentRejectCount: 0, documentContinueCount: 0, rejection: { experienced: 0, elderly: 0, unsuitable: 0, foreign: 0, declined: 0, other: 0 } };
  }
  const headers = data[0];
  const headerMap = {};
  headers.forEach((h, i) => headerMap[h] = i);
  
  const get = (row, key, fallbacks = []) => {
    if (headerMap[key] != null) return row[headerMap[key]];
    for (let i = 0; i < fallbacks.length; i++) {
      const k = fallbacks[i];
      if (headerMap[k] != null) return row[headerMap[k]];
    }
    return '';
  };
  
  let applyCount = 0;
  let applyRejectCount = 0;
  let applyContinueCount = 0;
  let interviewScheduled = 0;
  let interviewConducted = 0;
  let interviewCancelled = 0;
  let hireCount = 0;
  let offerAcceptedCount = 0;
  let processedRows = 0;
  const rejection = { experienced: 0, elderly: 0, unsuitable: 0, foreign: 0, declined: 0, other: 0 };
  let documentRejectCount = 0;
  // この採用管理シートの対応フォーム提出数
  const formSheetsForThis = getFormSheetNamesForRecruitmentSheet(sheet.getName());
  const documentSubmittedForThis = countFormSubmissionsInWeekDirect(startDate, endDate, formSheetsForThis);
  dbg('[DETAIL] sheet docSubmitted', { sheet: sheet.getName(), value: documentSubmittedForThis, formSheets: formSheetsForThis });
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = (get(row, '現状ステータス', ['ステータス']) || '').toString();
    const appDate = get(row, '応募日', ['応募日時']);
    const interviewPlan = get(row, '面談予定日時', ['面接予定日', '面接日']);
    const interviewDone = get(row, '面談実施日', ['面接実施日', '面談完了日', '面接完了日']);
    const acceptedDate = get(row, '内定受諾日', ['承諾日', '内定承諾日']);
    const reason = (get(row, '理由', ['不採用理由']) || '').toString();
    const nameValue = get(row, '名前', ['氏名', '応募者名']);
    
    // 応募系: 応募日で週判定
    if (appDate && isValidDateInRange(appDate, startDate, endDate)) {
      applyCount++;
      if (status.includes('応募落ち')) applyRejectCount++;
      if (status.includes('フォーム回答待ち')) applyContinueCount++;
    }
    
    // 面接予定: G列系
    if (interviewPlan && isValidDateInRange(interviewPlan, startDate, endDate)) {
      interviewScheduled++;
      if (status.includes('面接不参加') || status.includes('面談不参加')) {
        interviewCancelled++;
      }
    }
    
    // 面接実施: H列系
    if (interviewDone && isValidDateInRange(interviewDone, startDate, endDate)) {
      interviewConducted++;
      if (status.includes('採用')) {
        hireCount++;
      }
    }
    
    // 受諾: I列系
    if (interviewDone && isValidDateInRange(interviewDone, startDate, endDate)) {
      offerAcceptedCount++;
    }
    
    // 書類不採用（フォームタイムスタンプ週基準）
    if (status.includes('書類落ち') || status.includes('書類不採用')) {
      const normalized = normalizeName(nameValue);
      const stamps = entryIndex[normalized] || [];
      const matched = findNearestTimestampWithinWindow(stamps, appDate, 30);
      if (matched && isValidDateInRange(matched, startDate, endDate)) {
        documentRejectCount++;
      }
    }

    // 不採用理由内訳（面談実施日が対象週のもののみ、転居系は除外）
    if (appDate && isValidDateInRange(appDate, startDate, endDate)) {
      // 面談後に確定した不採用系のみを対象（応募落ち・書類落ちは除外）
      if (status.includes('不採用') || status.includes('採用辞退') || (status.includes('書類落ち') || status.includes('応募落ち'))) {
        if (reason) {
          if (reason.includes('経験者')) {
            rejection.experienced++;
          } else if (reason.includes('高齢') || reason.includes('年齢')) {
            rejection.elderly++;
          } else if (reason.includes('不適合') || reason.includes('ミスマッチ')) {
            rejection.unsuitable++;
          } else if (reason.includes('外国籍') || reason.includes('国籍')) {
            rejection.foreign++;
          } else if (reason.includes('辞退') || reason.includes('内定後') || reason.includes('採用辞退')) {
            rejection.declined++;
          } else if (!(reason.includes('転居') || reason.includes('引っ越し') || reason.includes('上京'))) {
            rejection.other++;
          }
        }
      }
    }
    
    processedRows++;
  }
  
  const documentContinueCount = Math.max(0, documentSubmittedForThis - documentRejectCount);
  return {
    processedRows,
    applyCount,
    applyRejectCount,
    applyContinueCount,
    interviewScheduled,
    interviewConducted,
    interviewCancelled,
    hireCount,
    offerAcceptedCount,
    documentSubmitted: documentSubmittedForThis,
    documentRejectCount,
    documentContinueCount,
    rejection
  };
}

/**
 * 正規化名（全角→半角, 空白除去, 小文字）
 */
function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .replace(/[\s\u3000]/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s){return String.fromCharCode(s.charCodeAt(0)-0xFEE0);})
    .toLowerCase();
}

/**
 * エントリーフォームのインデックスを構築: 正規化名 -> タイムスタンプ配列
 */
function buildEntryFormTimestampIndex(targetFormSheets) {
  const index = {};
  const ss = SpreadsheetApp.openById('1lcjC-KOH8OD9Ar3J4XIPz62vSRLI7xfXCwKM2o7PRjY');
  const sheets = ss.getSheets();
  if (Array.isArray(targetFormSheets) && targetFormSheets.length === 0) {
    return index; // 対象シートが無い場合は空
  }
  const useSheets = targetFormSheets && targetFormSheets.length > 0
    ? sheets.filter(s => targetFormSheets.includes(s.getName()))
    : sheets;
  useSheets.forEach(sheet => {
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;
    const headers = data[0];
    const nameIdx = headers.findIndex(h => h === '名前');
    const tsIdx = 0; // A列：タイムスタンプ
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const n = normalizeName(nameIdx !== -1 ? row[nameIdx] : '');
      const ts = row[tsIdx];
      if (!n || !ts) continue;
      if (!index[n]) index[n] = [];
      const dt = ts instanceof Date ? ts : new Date(ts);
      if (!isNaN(dt.getTime())) index[n].push(dt);
    }
  });
  Object.keys(index).forEach(k => index[k].sort((a,b)=>a-b));
  return index;
}

/**
 * 週内のフォーム提出数をカウント
 */
function countFormSubmissionsInWeek(entryIndex, startDate, endDate) {
  const start = parseYMDToDate(startDate);
  const end = parseYMDToDate(endDate);
  if (end) { end.setHours(23,59,59,999); }
  let count = 0;
  Object.values(entryIndex).forEach(arr => {
    arr.forEach(d => { if (d >= start && d <= end) count++; });
  });
  return count;
}

/**
 * 直接フォームシートから週内の提出件数をカウント（名寄せ不要）
 */
function countFormSubmissionsInWeekDirect(startDate, endDate, targetFormSheets) {
  const ss = SpreadsheetApp.openById('1lcjC-KOH8OD9Ar3J4XIPz62vSRLI7xfXCwKM2o7PRjY');
  const sheets = ss.getSheets();
  if (Array.isArray(targetFormSheets) && targetFormSheets.length === 0) {
    dbg('[DETAIL] form sheets used [] (none for this recruitment sheet)');
    return 0; // 対象なし
  }
  const useSheets = targetFormSheets && targetFormSheets.length > 0
    ? sheets.filter(s => targetFormSheets.includes(s.getName()))
    : sheets;
  dbg('[DETAIL] form sheets used', useSheets.map(s=>s.getName()))
  const start = parseYMDToDate(startDate);
  const end = parseYMDToDate(endDate);
  end.setHours(23,59,59,999);
  let count = 0;
  useSheets.forEach(sheet => {
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;
    for (let i = 1; i < data.length; i++) {
      const ts = data[i][0];
      const d = ts instanceof Date ? ts : new Date(ts);
      const ok = !isNaN(d.getTime()) && d >= start && d <= end;
      if (ok) count++;
      if (i <= 3 || ok) {
        dbg('[DETAIL] row', { sheet: sheet.getName(), row: i+1, ts: ts, parsed: (d.toISOString ? d.toISOString() : d), inRange: ok });
      }
    }
  });
  return count;
}

/**
 * 応募日近接(±days)で最も近いタイムスタンプを返す
 */
function findNearestTimestampWithinWindow(timestamps, applicationDate, days) {
  if (!applicationDate || !timestamps || timestamps.length === 0) return null;
  const base = new Date(applicationDate).getTime();
  const windowMs = days * 24 * 60 * 60 * 1000;
  let best = null; let bestDiff = Infinity;
  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i].getTime();
    const diff = Math.abs(t - base);
    if (diff <= windowMs && diff < bestDiff) { best = new Date(timestamps[i]); bestDiff = diff; }
  }
  return best;
}

/**
 * "yyyy/MM/dd" もしくは "yyyy-MM-dd" を Date に変換（JST）
 */
function parseYMDToDate(s) {
  if (!s) return null;
  try {
    const parts = String(s).split(/[\/\-]/).map(function(x){ return parseInt(x, 10); });
    if (parts.length < 3) return null;
    return new Date(parts[0], parts[1]-1, parts[2]);
  } catch (e) {
    return null;
  }
}

// --- Debug log utilities (UIにも返す) ---
var __DEBUG_LOGS = [];
function dbg(message, data) {
  try {
    var line = '[DBG] ' + message + (typeof data !== 'undefined' ? ' ' + (typeof data === 'string' ? data : JSON.stringify(data)) : '');
    console.log(line);
    __DEBUG_LOGS.push(line);
  } catch (e) {}
}
function flushDebugLogs() {
  var out = __DEBUG_LOGS.slice();
  __DEBUG_LOGS.length = 0;
  return out;
}