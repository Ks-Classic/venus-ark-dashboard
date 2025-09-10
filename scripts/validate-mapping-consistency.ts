#!/usr/bin/env ts-node

/**
 * マッピング整合性検証スクリプト
 * 
 * 目的:
 * - YAMLマッピングファイルと実装コードの整合性確認
 * - DATA_DEFINITION.mdとの同期状況確認
 * - 新規フィールド追加時の必須更新チェック
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { loadSheetsMapping, loadNotionMapping } from '../lib/utils/mapping-loader';

interface ValidationResult {
  category: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
}

/**
 * Google Sheetsマッピングの整合性チェック
 */
async function validateSheetsMapping(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  try {
    const mapping = await loadSheetsMapping();
    const implementationFile = 'lib/integrations/optimized-google-sheets.ts';
    
    if (!fs.existsSync(implementationFile)) {
      results.push({
        category: 'Google Sheets',
        type: 'error',
        message: `実装ファイルが見つかりません: ${implementationFile}`,
        file: implementationFile
      });
      return results;
    }
    
    const implementationCode = fs.readFileSync(implementationFile, 'utf-8');
    
    // YAMLで定義されているフィールドが実装で使用されているかチェック
    Object.entries(mapping.recruitment_sheets.common_columns).forEach(([key, columnName]) => {
      const searchPattern = `getValueFromRow.*'${key}'`;
      if (!new RegExp(searchPattern).test(implementationCode)) {
        results.push({
          category: 'Google Sheets',
          type: 'warning',
          message: `YAMLで定義されたフィールド '${key}' (列名: '${columnName}') が実装で使用されていない可能性があります`,
          file: implementationFile
        });
      }
    });
    
    // ハードコードされた列名が残っていないかチェック
    const hardcodedPatterns = [
      /'名前'/g,
      /'メールアドレス'/g,
      /'応募日'/g,
      /'現状ステータス'/g,
      /'不採用理由'/g
    ];
    
    hardcodedPatterns.forEach(pattern => {
      const matches = implementationCode.match(pattern);
      if (matches) {
        results.push({
          category: 'Google Sheets',
          type: 'error',
          message: `ハードコードされた列名が検出されました: ${matches[0]}。YAMLマッピングを使用してください。`,
          file: implementationFile
        });
      }
    });
    
  } catch (error) {
    results.push({
      category: 'Google Sheets',
      type: 'error',
      message: `マッピング検証エラー: ${error instanceof Error ? error.message : String(error)}`
    });
  }
  
  return results;
}

/**
 * Notionマッピングの整合性チェック
 */
async function validateNotionMapping(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  try {
    const mapping = await loadNotionMapping();
    const implementationFile = 'lib/integrations/notion.ts';
    
    if (!fs.existsSync(implementationFile)) {
      results.push({
        category: 'Notion',
        type: 'error',
        message: `実装ファイルが見つかりません: ${implementationFile}`,
        file: implementationFile
      });
      return results;
    }
    
    const implementationCode = fs.readFileSync(implementationFile, 'utf-8');
    
    // YAMLで定義されているプロパティが実装で使用されているかチェック
    Object.entries(mapping.member_database.properties).forEach(([key, property]) => {
      const searchPattern = `getPropertyValue.*'${key}'`;
      if (!new RegExp(searchPattern).test(implementationCode)) {
        results.push({
          category: 'Notion',
          type: 'warning',
          message: `YAMLで定義されたプロパティ '${key}' (プロパティ名: '${property.property_name}') が実装で使用されていない可能性があります`,
          file: implementationFile
        });
      }
    });
    
    // ハードコードされたプロパティ名が残っていないかチェック
    const hardcodedPatterns = [
      /'名前'/g,
      /'メールアドレス'/g,
      /'ステータス'/g,
      /'最新業務開始日'/g,
      /'最新業務終了日'/g
    ];
    
    hardcodedPatterns.forEach(pattern => {
      const matches = implementationCode.match(pattern);
      if (matches) {
        results.push({
          category: 'Notion',
          type: 'error',
          message: `ハードコードされたプロパティ名が検出されました: ${matches[0]}。YAMLマッピングを使用してください。`,
          file: implementationFile
        });
      }
    });
    
  } catch (error) {
    results.push({
      category: 'Notion',
      type: 'error',
      message: `マッピング検証エラー: ${error.message}`
    });
  }
  
  return results;
}

/**
 * DATA_DEFINITION.mdとの同期チェック
 */
async function validateDocumentationSync(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  const docPath = 'docs/DATA_DEFINITION.md';
  if (!fs.existsSync(docPath)) {
    results.push({
      category: 'Documentation',
      type: 'error',
      message: `ドキュメントファイルが見つかりません: ${docPath}`,
      file: docPath
    });
    return results;
  }
  
  const docContent = fs.readFileSync(docPath, 'utf-8');
  
  try {
    // YAMLファイルに定義されているフィールドがドキュメントに記載されているかチェック
    const sheetsMapping = await loadSheetsMapping();
    const notionMapping = await loadNotionMapping();
    
    // Google Sheetsフィールドのチェック
    Object.entries(sheetsMapping.recruitment_sheets.common_columns).forEach(([key, columnName]) => {
      if (!docContent.includes(columnName as string)) {
        results.push({
          category: 'Documentation',
          type: 'warning',
          message: `Google Sheetsの列名 '${columnName}' がDATA_DEFINITION.mdに記載されていません`,
          file: docPath
        });
      }
    });
    
    // Notionプロパティのチェック
    Object.entries(notionMapping.member_database.properties).forEach(([key, property]) => {
      if (!docContent.includes(property.property_name)) {
        results.push({
          category: 'Documentation',
          type: 'warning',
          message: `Notionのプロパティ名 '${property.property_name}' がDATA_DEFINITION.mdに記載されていません`,
          file: docPath
        });
      }
    });
    
    // マッピング管理ルールの存在確認
    if (!docContent.includes('マッピング管理ルール')) {
      results.push({
        category: 'Documentation',
        type: 'error',
        message: 'DATA_DEFINITION.mdにマッピング管理ルールが記載されていません',
        file: docPath
      });
    }
    
  } catch (error) {
    results.push({
      category: 'Documentation',
      type: 'error',
      message: `ドキュメント同期チェックエラー: ${error.message}`
    });
  }
  
  return results;
}

/**
 * 型定義の整合性チェック
 */
async function validateTypeDefinitions(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  const enumsFile = 'lib/types/enums.ts';
  if (!fs.existsSync(enumsFile)) {
    results.push({
      category: 'Types',
      type: 'error',
      message: `型定義ファイルが見つかりません: ${enumsFile}`,
      file: enumsFile
    });
    return results;
  }
  
  try {
    const sheetsMapping = await loadSheetsMapping();
    const enumsContent = fs.readFileSync(enumsFile, 'utf-8');
    
    // YAMLで定義されているステータス値が型定義に含まれているかチェック
    sheetsMapping.status_values.valid_statuses.forEach((status: string) => {
      if (!enumsContent.includes(`'${status}'`)) {
        results.push({
          category: 'Types',
          type: 'warning',
          message: `ステータス値 '${status}' がApplicationStatus型に定義されていません`,
          file: enumsFile
        });
      }
    });
    
  } catch (error) {
    results.push({
      category: 'Types',
      type: 'error',
      message: `型定義チェックエラー: ${error.message}`
    });
  }
  
  return results;
}

/**
 * 必須ファイルの存在チェック
 */
function validateRequiredFiles(): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  const requiredFiles = [
    'lib/config/sheets-mapping.yaml',
    'lib/config/notion-mapping.yaml',
    'lib/utils/mapping-loader.ts',
    'lib/integrations/optimized-google-sheets.ts',
    'lib/integrations/notion.ts',
    'lib/types/enums.ts',
    'docs/DATA_DEFINITION.md'
  ];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      results.push({
        category: 'Files',
        type: 'error',
        message: `必須ファイルが存在しません: ${file}`,
        file
      });
    }
  });
  
  return results;
}

/**
 * 結果の出力
 */
function printResults(results: ValidationResult[]) {
  console.log('\n📋 マッピング整合性検証結果');
  console.log('=' .repeat(60));
  
  if (results.length === 0) {
    console.log('✅ すべての検証をパスしました！');
    return;
  }
  
  const errors = results.filter(r => r.type === 'error');
  const warnings = results.filter(r => r.type === 'warning');
  const infos = results.filter(r => r.type === 'info');
  
  console.log(`\n📊 サマリー:`);
  console.log(`  🔴 エラー: ${errors.length}`);
  console.log(`  🟡 警告: ${warnings.length}`);
  console.log(`  🔵 情報: ${infos.length}`);
  
  // カテゴリ別に結果を表示
  const categories = [...new Set(results.map(r => r.category))];
  
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    console.log(`\n📁 ${category}:`);
    
    categoryResults.forEach((result, index) => {
      const icon = result.type === 'error' ? '🔴' : result.type === 'warning' ? '🟡' : '🔵';
      console.log(`  ${icon} ${result.message}`);
      if (result.file) {
        console.log(`     📄 ファイル: ${result.file}`);
      }
    });
  });
  
  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length}件のエラーが検出されました。修正が必要です。`);
  } else if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length}件の警告があります。確認することをお勧めします。`);
  } else {
    console.log('\n✅ 重大な問題は検出されませんでした。');
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🚀 マッピング整合性検証を開始...');
    
    // 並行して各種検証を実行
    const [
      fileResults,
      sheetsResults,
      notionResults,
      docResults,
      typeResults
    ] = await Promise.all([
      Promise.resolve(validateRequiredFiles()),
      validateSheetsMapping(),
      validateNotionMapping(),
      validateDocumentationSync(),
      validateTypeDefinitions()
    ]);
    
    const allResults = [
      ...fileResults,
      ...sheetsResults,
      ...notionResults,
      ...docResults,
      ...typeResults
    ];
    
    printResults(allResults);
    
    // エラーがある場合は終了コード1で終了
    const hasErrors = allResults.some(r => r.type === 'error');
    process.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    console.error('❌ 検証処理でエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
} 