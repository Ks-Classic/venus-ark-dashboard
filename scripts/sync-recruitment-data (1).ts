#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { getAllJobCategoryData, extractSpreadsheetId, getSheetData } from '../lib/integrations/google-sheets';
import { validateAndTransformSheetData, validateApplicationInput } from '../lib/data-processing/validation';
import { batchUpsertApplications } from '../lib/firestore/applications';
import { JobCategory, ApplicationInput } from '../lib/types/application';

// 環境変数を読み込み
dotenv.config({ path: '.env.local' });

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

/**
 * 採用データ同期のメイン処理
 */
async function syncRecruitmentData(): Promise<void> {
  console.log('=== Venus Ark 採用データ同期開始 ===');
  console.log(`開始時刻: ${new Date().toLocaleString('ja-JP')}`);
  
  try {
    // 環境変数の確認
    const spreadsheetId = process.env.MAIN_RECRUITMENT_SPREADSHEET_ID;
    const spreadsheetUrl = process.env.RECRUITMENT_SPREADSHEET_URL;
    
    let targetSpreadsheetId: string | null = spreadsheetId || null;
    
    if (!targetSpreadsheetId && spreadsheetUrl) {
      targetSpreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    }
    
    if (!targetSpreadsheetId) {
      throw new Error('MAIN_RECRUITMENT_SPREADSHEET_ID または RECRUITMENT_SPREADSHEET_URL が設定されていません');
    }
    
    console.log(`対象スプレッドシート: ${targetSpreadsheetId}`);
    
    // 対象シート名の定義
    const targetSheets = [
      'indeed応募者管理(SNS運用)',
      'engageその他応募者管理(SNS運用)',
      'indeed応募者管理(動画編集)',
      'engageその他応募者管理(動画編集)',
      'indeed応募者管理(ライター/AIライター)',
      'engageその他応募者管理(ライター/AIライター)',
      'indeed応募者管理(撮影スタッフ) ',
      'engageその他応募者管理(撮影スタッフ) '
    ];
    
    console.log('\n--- Google Sheetsからデータ取得中 ---');
    const syncResults: SyncResult[] = [];
    
    // シートごとに処理
    for (const sheetName of targetSheets) {
      console.log(`\n--- シート「${sheetName}」の処理開始 ---`);
      
      // データを取得（テスト用に最初の100行のみ）
      console.log(`シート ${sheetName} からデータを取得中...`);
      const sheetData = await getSheetData(targetSpreadsheetId as string, `${sheetName}!1:100`);
      
      if (!sheetData || sheetData.length <= 1) {
        console.log(`シート ${sheetName} にデータがありません`);
        continue;
      }
      
      console.log(`取得データ数: ${sheetData.length - 1} 件`);
      
      // データの検証・変換
      const validInputs: Array<{
        input: ApplicationInput;
        sourceSheetId: string;
        sourceRowIndex: number;
      }> = [];
      
      let validCount = 0;
      let skipCount = 0;
      
      // ヘッダー行をスキップして処理
      const headers = sheetData[0]; // ヘッダー行を取得
      for (let i = 1; i < sheetData.length; i++) {
        const rowData = sheetData[i];
        const sourceRowIndex = i + 1;
        
        // 行データをオブジェクト形式に変換
        const rowObject: { [key: string]: any } = {};
        for (let j = 0; j < headers.length; j++) {
          if (headers[j]) {
            rowObject[headers[j]] = rowData[j] || '';
          }
        }
        
        try {
          // データを検証・変換
          const applicationInput = validateAndTransformSheetData(
            rowObject,
            targetSpreadsheetId as string,
            sourceRowIndex
          );
          
          // デバッグ: 最初の数行のデータ内容を表示
          if (i <= 5) {
            console.log(`行 ${sourceRowIndex} のデータ:`, {
              名前: rowObject['名前'],
              応募日: rowObject['応募日'],
              職種: rowObject['職種'],
              現状ステータス: rowObject['現状ステータス']
            });
          }
          
          if (applicationInput && validateApplicationInput(applicationInput)) {
            validInputs.push({
              input: applicationInput,
              sourceSheetId: targetSpreadsheetId as string,
              sourceRowIndex
            });
            validCount++;
          } else {
            if (i <= 5) {
              console.warn(`行 ${sourceRowIndex}: データが無効のためスキップ`);
            }
            skipCount++;
          }
        } catch (error) {
          if (i <= 5) {
            console.error(`行 ${sourceRowIndex}: 処理エラー`, error);
          }
          skipCount++;
        }
      }
      
      console.log(`シート「${sheetName}」: 有効データ ${validCount} 件、スキップ ${skipCount} 件`);
      
      // Firestoreに同期
      let batchResult = { processed: 0, added: 0, updated: 0, errors: 0 };
      
      if (validInputs.length > 0) {
        console.log(`シート「${sheetName}」: Firestoreに同期中...`);
        batchResult = await batchUpsertApplications(validInputs);
        console.log(`シート「${sheetName}」: 同期完了 - 処理: ${batchResult.processed}, 追加: ${batchResult.added}, 更新: ${batchResult.updated}, エラー: ${batchResult.errors}`);
      }
      
      // 職種を推定（シート名から）
      let jobCategory: JobCategory = 'SNS運用'; // デフォルト
      if (sheetName.includes('動画編集')) {
        jobCategory = '動画クリエイター';
      } else if (sheetName.includes('ライター')) {
        jobCategory = 'AIライター';
      } else if (sheetName.includes('撮影スタッフ')) {
        jobCategory = '撮影スタッフ';
      }
      
      syncResults.push({
        jobCategory,
        totalRows: sheetData.length - 1,
        validRows: validCount,
        processed: batchResult.processed,
        added: batchResult.added,
        updated: batchResult.updated,
        errors: batchResult.errors,
        skipped: skipCount
      });
    }
    
    // 結果サマリーを表示
    console.log('\n=== 同期結果サマリー ===');
    console.log('職種別結果:');
    
    let totalRows = 0;
    let totalValid = 0;
    let totalProcessed = 0;
    let totalAdded = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    
    for (const result of syncResults) {
      console.log(`  ${result.jobCategory}:`);
      console.log(`    取得: ${result.totalRows} 件`);
      console.log(`    有効: ${result.validRows} 件`);
      console.log(`    処理: ${result.processed} 件`);
      console.log(`    追加: ${result.added} 件`);
      console.log(`    更新: ${result.updated} 件`);
      console.log(`    エラー: ${result.errors} 件`);
      console.log(`    スキップ: ${result.skipped} 件`);
      
      totalRows += result.totalRows;
      totalValid += result.validRows;
      totalProcessed += result.processed;
      totalAdded += result.added;
      totalUpdated += result.updated;
      totalErrors += result.errors;
      totalSkipped += result.skipped;
    }
    
    console.log('\n全体サマリー:');
    console.log(`  取得データ総数: ${totalRows} 件`);
    console.log(`  有効データ数: ${totalValid} 件`);
    console.log(`  処理データ数: ${totalProcessed} 件`);
    console.log(`  新規追加: ${totalAdded} 件`);
    console.log(`  更新: ${totalUpdated} 件`);
    console.log(`  エラー: ${totalErrors} 件`);
    console.log(`  スキップ: ${totalSkipped} 件`);
    
    const successRate = totalRows > 0 ? ((totalProcessed / totalRows) * 100).toFixed(1) : '0.0';
    console.log(`  成功率: ${successRate}%`);
    
    console.log(`\n完了時刻: ${new Date().toLocaleString('ja-JP')}`);
    console.log('=== 採用データ同期完了 ===');
    
  } catch (error) {
    console.error('採用データ同期でエラーが発生しました:', error);
    process.exit(1);
  }
}

/**
 * コマンドライン引数の処理
 */
function parseArguments(): { dryRun: boolean; verbose: boolean } {
  const args = process.argv.slice(2);
  
  return {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };
}

// メイン実行
if (require.main === module) {
  const { dryRun, verbose } = parseArguments();
  
  if (dryRun) {
    console.log('*** ドライランモード: 実際の同期は行いません ***');
  }
  
  if (verbose) {
    console.log('*** 詳細ログモード ***');
  }
  
  syncRecruitmentData()
    .then(() => {
      console.log('スクリプトが正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('スクリプト実行中にエラーが発生しました:', error);
      process.exit(1);
    });
} 