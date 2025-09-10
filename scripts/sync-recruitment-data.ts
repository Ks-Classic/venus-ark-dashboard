import dotenv from 'dotenv';
import path from 'path';
import { Timestamp } from 'firebase-admin/firestore';
import logger from '../lib/logger'; // pinoロガーをインポート
import { getEntryFormTimestampMap, extractSpreadsheetId, getSheetData } from '../lib/integrations/google-sheets';
import { validateAndTransformSheetData, validateApplicationInput } from '../lib/data-processing/validation';
import { batchUpsertApplications } from '../lib/firestore/applications';
import { ApplicationInput } from '../lib/types/application';
import { JobCategory } from '../lib/types/enums';
import { addSyncLog } from '../lib/firestore/sync_logs';
import { generateWeeklyRecruitmentReport } from '../lib/analytics/weekly-aggregation';
import { upsertWeeklyReport } from '../lib/firestore/weekly_reports';
import { getWeekNumberFromDate } from '../lib/date';

// .env.localを読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface SyncResult {
  jobCategory: JobCategory;
  totalRows: number;
  validRows: number;
  processed: number;
  added: number;
  updated: number;
  errors: number;
  skipped: number;
}

type AffectedWeek = {
  year: number;
  month: number;
  weekInMonth: number;
};

import { getWeekDateRange } from '../lib/date';

/**
 * 採用データ同期のメイン処理
 * @param options - 特定の週を対象とする場合に指定 { year, month, weekInMonth }
 */
export async function syncRecruitmentData(options?: { year: number; month: number; weekInMonth: number }): Promise<any> {
  const isWeeklySync = !!options;
  const syncType = isWeeklySync ? `週次 (${options.year}-${options.month}-${options.weekInMonth})` : '全体';
  logger.info(`=== Venus Ark 採用データ同期開始 (${syncType}) ===`);
  
  const startTime = new Date();
  logger.info(`開始時刻: ${startTime.toLocaleString('ja-JP')}`);

  // 日付範囲の計算 (週次同期の場合)
  let dateRange: { start: Date; end: Date; } | null = null;
  if (isWeeklySync && options) {
    dateRange = getWeekDateRange(options.year, options.month, options.weekInMonth);
    logger.info(`対象期間: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`);
  }

  // 動的インポートでFirebase Admin SDKを初期化
  const { initializeFirebaseAdmin } = await import('../lib/firebase/admin');
  initializeFirebaseAdmin();
  logger.info('Firebase Admin SDK Initialized.');

  try {
    const spreadsheetId = process.env.MAIN_RECRUITMENT_SPREADSHEET_ID || extractSpreadsheetId(process.env.RECRUITMENT_SPREADSHEET_URL || '');
    if (!spreadsheetId) {
      logger.error('MAIN_RECRUITMENT_SPREADSHEET_ID または RECRUITMENT_SPREADSHEET_URL が設定されていません');
      throw new Error('Spreadsheet ID/URL is not configured.');
    }
    logger.info(`対象スプレッドシート: ${spreadsheetId}`);

    logger.info('--- エントリーフォームからタイムスタンプ取得中 ---');
    const timestampMap = await getEntryFormTimestampMap();
    logger.info(`タイムスタンプ ${Object.keys(timestampMap).length} 件取得完了`);

    const targetSheets = [
      'indeed応募者管理(SNS運用)', 'engageその他応募者管理(SNS運用)',
      'indeed応募者管理(動画編集)', 'engageその他応募者管理(動画編集)',
      'indeed応募者管理(ライター/AIライター)', 'engageその他応募者管理(ライター/AIライター)',
      'indeed応募者管理(撮影スタッフ)', 'engageその他応募者管理(撮影スタッフ)' // 末尾のスペースを削除
    ];

    logger.info('--- Google Sheetsからデータ取得中 ---');
    const syncResults: SyncResult[] = [];
    const affectedWeeks = new Map<string, AffectedWeek>();

    for (const sheetName of targetSheets) {
      const trimmedSheetName = sheetName.trim(); // シート名の前後の空白を削除
      logger.info(`--- シート「${trimmedSheetName}」の処理開始 ---`);
      const sheetData = await getSheetData(spreadsheetId, trimmedSheetName);

      if (!sheetData || sheetData.length <= 1) {
        logger.warn(`シート ${sheetName} にデータがありません`);
        continue;
      }
      logger.info(`取得データ数: ${sheetData.length - 1} 件`);

      const validInputs: Array<{ input: ApplicationInput; sourceSheetId: string; sourceRowIndex: number; }> = [];
      let validCount = 0;
      let skipCount = 0;
      const headers = sheetData[0];

      for (let i = 1; i < sheetData.length; i++) {
        const rowData = sheetData[i];
        const sourceRowIndex = i + 1;
        const rowObject: { [key: string]: any } = {};
        headers.forEach((header, j) => {
          if (header) rowObject[header] = rowData[j] || '';
        });

        try {
          const applicationInput = validateAndTransformSheetData(rowObject, spreadsheetId, sourceRowIndex, timestampMap, sheetName);
          
          // 週次同期の場合、日付フィルタリングを実行
          if (isWeeklySync && dateRange && applicationInput?.applicationDate) {
            const appDate = applicationInput.applicationDate.toDate();
            if (appDate < dateRange.start || appDate > dateRange.end) {
              // logger.info(`Skipping row ${sourceRowIndex} outside date range.`);
              continue; // 期間外のデータはスキップ
            }
          }

          if (applicationInput && validateApplicationInput(applicationInput)) {
            validInputs.push({ input: applicationInput, sourceSheetId: spreadsheetId, sourceRowIndex });
            validCount++;
            if (applicationInput.applicationDate instanceof Timestamp) {
              const date = applicationInput.applicationDate.toDate();
              const weekInfo = getWeekNumberFromDate(date);
              const weekKey = `${weekInfo.year}-${weekInfo.month}-${weekInfo.weekInMonth}`;
              if (!affectedWeeks.has(weekKey)) {
                affectedWeeks.set(weekKey, weekInfo);
              }
            }
          } else {
            skipCount++;
          }
        } catch (error: any) {
          // logger.warn({ msg: `行 ${sourceRowIndex}: 処理エラー`, error: error.message });
          skipCount++;
        }
      }
      logger.info(`シート「${sheetName}」: 有効データ ${validCount} 件、スキップ ${skipCount} 件`);

      let batchResult = { processed: 0, added: 0, updated: 0, errors: 0 };
      if (validInputs.length > 0) {
        logger.info(`シート「${sheetName}」: Firestoreに同期中...`);
        batchResult = await batchUpsertApplications(validInputs);
        logger.info({
          msg: `シート「${sheetName}」: 同期完了`,
          processed: batchResult.processed,
          added: batchResult.added,
          updated: batchResult.updated,
          errors: batchResult.errors
        });
      }

      let jobCategory: JobCategory = JobCategory.SNS_OPERATION;
      if (sheetName.includes('動画編集')) jobCategory = JobCategory.VIDEO_CREATOR;
      else if (sheetName.includes('ライター')) jobCategory = JobCategory.AI_WRITER;
      else if (sheetName.includes('撮影スタッフ')) jobCategory = JobCategory.PHOTOGRAPHY_STAFF;

      syncResults.push({
        jobCategory,
        totalRows: sheetData.length - 1,
        validRows: validCount,
        ...batchResult,
        skipped: skipCount
      });
    }

    const summary = syncResults.reduce((acc, result) => {
        acc.totalRows += result.totalRows;
        acc.totalValid += result.validRows;
        acc.totalProcessed += result.processed;
        acc.totalAdded += result.added;
        acc.totalUpdated += result.updated;
        acc.totalErrors += result.errors;
        acc.totalSkipped += result.skipped;
        return acc;
    }, { totalRows: 0, totalValid: 0, totalProcessed: 0, totalAdded: 0, totalUpdated: 0, totalErrors: 0, totalSkipped: 0 });

    logger.info({ msg: `=== 同期結果サマリー (${syncType}) ===`, summary });
    
    logger.info('--- 週次レポートの再生成開始 ---');
    const weeksToRegenerate = isWeeklySync && options ? [options] : Array.from(affectedWeeks.values());
    const updatedReports = []; // 更新されたレポートを格納する配列

    if (weeksToRegenerate.length === 0) {
        logger.info('影響のある週はありません。レポート再生成をスキップします。');
    } else {
        logger.info(`影響のある週: ${weeksToRegenerate.map(w => `${w.year}-${w.month}-${w.weekInMonth}`).join(', ')}`);
        for (const weekInfo of weeksToRegenerate) {
            const { year, month, weekInMonth } = weekInfo;
            const jobCategories: JobCategory[] = Object.values(JobCategory);
            for (const jobCategory of jobCategories) {
                try {
                    logger.info(`レポート生成中: ${year}年${month}月${weekInMonth}週 for ${jobCategory}`);
                    const report = await generateWeeklyRecruitmentReport(year, month, weekInMonth, jobCategory);
                    await upsertWeeklyReport(report);
                    updatedReports.push(report); // 生成したレポートを配列に追加
                    logger.info(`レポート保存完了: ${report.id}`);
                } catch (error) {
                    logger.error({ msg: `レポート生成エラー: ${year}年${month}月${weekInMonth}週 for ${jobCategory}`, error });
                }
            }
        }
    }
    logger.info('--- 週次レポートの再生成完了 ---');

    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    logger.info(`完了時刻: ${endTime.toLocaleString('ja-JP')} (所要時間: ${duration.toFixed(2)}秒)`);
    logger.info(`=== 採用データ同期正常完了 (${syncType}) ===`);

    return {
      success: true,
      message: `採用データ同期 (${syncType}) が正常に完了しました。`,
      summary,
      affectedWeeks: Array.from(affectedWeeks.keys()),
      updatedReports, // 更新されたレポートデータを返す
    };

  } catch (error: any) {
    logger.error({ msg: `採用データ同期で致命的なエラーが発生しました (${syncType})`, error: error.stack });
    return {
      success: false,
      message: `採用データ同期中にエラーが発生しました。 (${syncType})`,
      error: error.message,
    };
  }
}

// コマンドラインから直接実行された場合の処理
if (require.main === module) {
  const args = process.argv.slice(2);
  const weekArg = args.find(arg => arg.startsWith('--week='));
  
  let options;
  if (weekArg) {
    const [year, month, weekInMonth] = weekArg.split('=')[1].split('-').map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(weekInMonth)) {
      options = { year, month, weekInMonth };
    }
  }

  logger.info('コマンドラインから手動で同期処理を実行します。');
  if (options) {
    logger.info(`対象週: ${options.year}-${options.month}-${options.weekInMonth}`);
  } else {
    logger.info('対象週: 全期間');
  }

  syncRecruitmentData(options).then(result => {
    // APIから呼び出された際に結果をJSONとして標準出力する
    // 常に結果を出力するように修正
    console.log(`SYNC_RESULT::${JSON.stringify(result)}`);
    if (!result.success) {
      process.exit(1);
    }
  });
}
