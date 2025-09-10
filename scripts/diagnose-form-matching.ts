import dotenv from 'dotenv';
import { getSpreadsheetSheetNames, getSheetData, extractSpreadsheetId, getEntryFormTimestampMap } from '../lib/integrations/google-sheets';
import { normalizeName } from '../lib/data-processing/normalization';
import { getWeekDateRange } from '../lib/date';

// .env.local を優先して読む（Next.js互換）
dotenv.config({ path: '.env.local' });

type SheetRow = { [key: string]: any };

function toIsoDateString(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().split('T')[0];
}

function parseDateLoose(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value).trim();
  if (!s) return null;
  // try YYYY-MM-DD or YYYY/MM/DD
  const norm = s.replace(/\./g, '-').replace(/\//g, '-');
  const d = new Date(norm);
  if (!isNaN(d.getTime())) return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  return null;
}

async function main() {
  const year = parseInt(process.env.DIAG_YEAR || process.argv[2] || '', 10);
  const month = parseInt(process.env.DIAG_MONTH || process.argv[3] || '', 10);
  const weekInMonth = parseInt(process.env.DIAG_WEEK || process.argv[4] || '', 10);

  if (!year || !month || !weekInMonth) {
    console.log('Usage: ts-node scripts/diagnose-form-matching.ts <year> <month> <weekInMonth>');
    process.exit(1);
  }

  const { start, end } = getWeekDateRange(year, month, weekInMonth);
  const startStr = toIsoDateString(start);
  const endStr = toIsoDateString(end);
  console.log(`[DIAG] week range: ${startStr} ~ ${endStr}`);

  const spreadsheetId = process.env.MAIN_RECRUITMENT_SPREADSHEET_ID || extractSpreadsheetId(process.env.RECRUITMENT_SPREADSHEET_URL || '') || '';
  if (!spreadsheetId) {
    throw new Error('MAIN_RECRUITMENT_SPREADSHEET_ID or RECRUITMENT_SPREADSHEET_URL is not set');
  }

  const sheetNames = await getSpreadsheetSheetNames(spreadsheetId);
  const targetSheets = sheetNames.filter((name) => name.includes('応募者管理') && (name.includes('indeed') || name.includes('engage')) && !name.includes('(営業)'));
  console.log(`[DIAG] target sheets: ${targetSheets.join(', ')}`);

  const entryMap = await getEntryFormTimestampMap();
  console.log(`[DIAG] entry form timestamp map size: ${entryMap.size}`);

  // 追加: エントリーフォームの生データを取得し、週内の行を抽出
  const entrySpreadsheetId = process.env.ENTRY_FORM_SPREADSHEET_ID || '';
  if (!entrySpreadsheetId) {
    throw new Error('ENTRY_FORM_SPREADSHEET_ID is not set');
  }
  const entrySheetData = await getSheetData(entrySpreadsheetId);
  const entryHeaders = entrySheetData[0] as string[];
  const idxEntryTs = entryHeaders.indexOf('タイムスタンプ');
  const idxEntryName = entryHeaders.indexOf('名前');
  const entryRows = entrySheetData.slice(1);
  type EntryRow = { rawName: string; norm: string; loose: string; dateStr: string };
  const stripDiacritics = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const stripPunct = (s: string) => s.replace(/[・\.．\-ー'’_]/g, '');
  const toLoose = (s: string) => stripPunct(stripDiacritics(s));

  const entryRowsInWeek: EntryRow[] = [];
  for (const row of entryRows) {
    const ts = row[idxEntryTs];
    const nm = row[idxEntryName];
    if (!ts || !nm) continue;
    const d = parseDateLoose(ts);
    if (!d) continue;
    if (!(d >= start && d <= end)) continue;
    const rawName = String(nm).trim();
    const norm = normalizeName(rawName);
    const loose = toLoose(norm);
    entryRowsInWeek.push({ rawName, norm, loose, dateStr: toIsoDateString(d) });
  }
  console.log(`[DIAG] entry form rows in week: ${entryRowsInWeek.length}`);

  type RowDiag = { sheet: string; rowIndex: number; name: string; normalized: string; applicationDate?: string };
  const weekRows: RowDiag[] = [];

  for (const sheetName of targetSheets) {
    const data = await getSheetData(spreadsheetId, `'${sheetName}'!A:Z`);
    if (!data || data.length <= 1) continue;
    const headers = data[0] as string[];
    const rows = data.slice(1);

    const idxName = headers.indexOf('名前');
    const idxApplied = headers.indexOf('応募日');
    if (idxName === -1 || idxApplied === -1) continue;

    rows.forEach((row, i) => {
      const applied = parseDateLoose(row[idxApplied]);
      if (!applied) return;
      if (!(applied >= start && applied <= end)) return;
      const name = String(row[idxName] || '').trim();
      const normalized = normalizeName(name);
      weekRows.push({ sheet: sheetName, rowIndex: i + 2, name, normalized, applicationDate: toIsoDateString(applied) });
    });
  }

  console.log(`[DIAG] week rows count: ${weekRows.length}`);

  let matched = 0;
  const missing: RowDiag[] = [];
  let classifiedNoSubmission = 0;
  let classifiedNameMismatch = 0;
  for (const r of weekRows) {
    if (entryMap.has(r.normalized)) {
      matched++;
    } else {
      missing.push(r);
    }
  }

  console.log(`[DIAG] matched in entry form: ${matched}`);
  console.log(`[DIAG] missing in entry form: ${missing.length}`);
  if (missing.length > 0) {
    console.log('--- missing samples (up to 30) ---');
    missing.slice(0, 30).forEach((m, idx) => {
      console.log(`${idx + 1}. sheet=${m.sheet} row=${m.rowIndex} applied=${m.applicationDate} name='${m.name}' normalized='${m.normalized}'`);
    });

    // 週内のフォーム行を用いた分類: 名寄せ問題 or 提出なし
    for (const m of missing) {
      const norm = m.normalized;
      const loose = toLoose(norm);
      const foundExact = entryRowsInWeek.some(er => er.norm === norm);
      const foundLoose = !foundExact && entryRowsInWeek.some(er => er.loose === loose || er.rawName.replace(/[\s　]/g, '') === m.name.replace(/[\s　]/g, ''));
      if (foundExact || foundLoose) {
        classifiedNameMismatch++;
      } else {
        classifiedNoSubmission++;
      }
    }
    console.log(`[DIAG] classification → name-mismatch: ${classifiedNameMismatch}, no-submission-in-week: ${classifiedNoSubmission}`);
  }
}

main().catch((e) => {
  console.error('[DIAG] failed:', e?.message || e);
  process.exit(1);
});


