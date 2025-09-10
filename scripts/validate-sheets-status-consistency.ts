#!/usr/bin/env ts-node

/**
 * Google Sheets ステータス値整合性チェックスクリプト
 * 
 * 目的:
 * - YAMLマッピングファイルのステータス値とApplicationStatus enumの整合性確認
 * - Google Sheets実データとの整合性確認
 * - 不整合があれば修正提案を出力
 */

import { loadSheetsMapping } from '../lib/utils/mapping-loader';
import { ApplicationStatus } from '../lib/types/enums';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Firebase設定
const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface ValidationResult {
  isValid: boolean;
  missingInEnum: string[];
  missingInYaml: string[];
  invalidInDatabase: string[];
  recommendations: string[];
}

/**
 * ApplicationStatus enum の全値を取得
 */
function getApplicationStatusValues(): ApplicationStatus[] {
  return [
    '応募', '書類提出', '面接', '面談確定', '面接実施', '採用', 
    '不採用', '辞退', '書類落ち', '応募落ち', '面談不参加', '離脱', '内定受諾'
  ];
}

/**
 * YAMLファイルとenum定義の整合性をチェック
 */
async function validateYamlEnumConsistency(): Promise<ValidationResult> {
  console.log('🔍 YAML ⇔ Enum 整合性チェック中...');
  
  const sheetsMapping = await loadSheetsMapping();
  const yamlStatuses: string[] = sheetsMapping.validation?.status_values?.valid_statuses || [];
  const enumStatuses = getApplicationStatusValues();
  
  const missingInEnum = yamlStatuses.filter(status => !enumStatuses.includes(status as ApplicationStatus));
  const missingInYaml = enumStatuses.filter(status => !yamlStatuses.includes(status));
  
  const isValid = missingInEnum.length === 0 && missingInYaml.length === 0;
  
  const recommendations: string[] = [];
  if (missingInEnum.length > 0) {
    recommendations.push(`lib/types/enums.ts の ApplicationStatus に以下を追加: ${missingInEnum.join(', ')}`);
  }
  if (missingInYaml.length > 0) {
    recommendations.push(`lib/config/sheets-mapping.yaml の valid_statuses に以下を追加: ${missingInYaml.join(', ')}`);
  }
  
  return {
    isValid,
    missingInEnum,
    missingInYaml,
    invalidInDatabase: [],
    recommendations
  };
}

/**
 * データベース内のステータス値をチェック
 */
async function validateDatabaseStatusValues(): Promise<ValidationResult> {
  console.log('🔍 データベース内ステータス値チェック中...');
  
  const applicationsRef = collection(db, 'applications');
  const snapshot = await getDocs(applicationsRef);
  
  const enumStatuses = getApplicationStatusValues();
  const databaseStatuses = new Set<string>();
  const invalidStatuses = new Set<string>();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const status = data.status;
    
    if (status) {
      databaseStatuses.add(status);
      if (!enumStatuses.includes(status as ApplicationStatus)) {
        invalidStatuses.add(status);
      }
    }
  });
  
  const invalidInDatabase = Array.from(invalidStatuses);
  const isValid = invalidInDatabase.length === 0;
  
  const recommendations: string[] = [];
  if (invalidInDatabase.length > 0) {
    recommendations.push(`データベース内の無効なステータス値を修正: ${invalidInDatabase.join(', ')}`);
    recommendations.push(`データ修正スクリプトの実行を検討`);
  }
  
  return {
    isValid,
    missingInEnum: [],
    missingInYaml: [],
    invalidInDatabase,
    recommendations
  };
}

/**
 * 実際のGoogle Sheetsデータからステータス値を取得
 * (この関数は実装例として提供、実際のシートアクセスが必要)
 */
async function getSheetsStatusValues(): Promise<string[]> {
  // 実装注意: 実際のGoogle Sheets APIを使用してステータス値を取得
  // 現在はFirestoreのデータを代替として使用
  console.log('📄 Google Sheets ステータス値取得中...');
  
  const applicationsRef = collection(db, 'applications');
  const snapshot = await getDocs(applicationsRef);
  
  const statusSet = new Set<string>();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.status) {
      statusSet.add(data.status);
    }
  });
  
  return Array.from(statusSet).sort();
}

/**
 * 結果レポートを出力
 */
function printValidationReport(yamlEnumResult: ValidationResult, databaseResult: ValidationResult, sheetsStatuses: string[]) {
  console.log(`\n📊 ApplicationStatus 整合性レポート`);
  console.log(`${'='.repeat(60)}`);
  
  // YAML ⇔ Enum チェック結果
  console.log(`\n✅ YAML ⇔ Enum 整合性: ${yamlEnumResult.isValid ? '正常' : '不整合あり'}`);
  if (yamlEnumResult.missingInEnum.length > 0) {
    console.log(`  ❌ Enum に不足: ${yamlEnumResult.missingInEnum.join(', ')}`);
  }
  if (yamlEnumResult.missingInYaml.length > 0) {
    console.log(`  ❌ YAML に不足: ${yamlEnumResult.missingInYaml.join(', ')}`);
  }
  
  // データベース整合性チェック結果
  console.log(`\n✅ データベース整合性: ${databaseResult.isValid ? '正常' : '不整合あり'}`);
  if (databaseResult.invalidInDatabase.length > 0) {
    console.log(`  ❌ 無効なステータス値: ${databaseResult.invalidInDatabase.join(', ')}`);
  }
  
  // 実際に使用されているステータス値
  console.log(`\n📋 実際に使用中のステータス値 (${sheetsStatuses.length}種類):`);
  sheetsStatuses.forEach(status => {
    const isValid = getApplicationStatusValues().includes(status as ApplicationStatus);
    console.log(`  ${isValid ? '✅' : '❌'} ${status}`);
  });
  
  // 推奨アクション
  const allRecommendations = [...yamlEnumResult.recommendations, ...databaseResult.recommendations];
  if (allRecommendations.length > 0) {
    console.log(`\n💡 推奨アクション:`);
    allRecommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }
  
  // 全体的な整合性判定
  const overallValid = yamlEnumResult.isValid && databaseResult.isValid;
  console.log(`\n🎯 全体的な整合性: ${overallValid ? '✅ 正常' : '❌ 要修正'}`);
}

/**
 * 自動修正機能（オプション）
 */
async function suggestAutoFix(yamlEnumResult: ValidationResult, databaseResult: ValidationResult) {
  if (!yamlEnumResult.isValid || !databaseResult.isValid) {
    console.log(`\n🔧 自動修正スクリプト生成の提案:`);
    console.log(`  - scripts/fix-status-inconsistencies.ts の作成を検討`);
    console.log(`  - データベース内の無効ステータス値の一括修正`);
    console.log(`  - YAML/Enum定義の自動同期機能`);
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🚀 Google Sheets ステータス値整合性チェックを開始...\n');
    
    // 各種チェックを並行実行
    const [yamlEnumResult, databaseResult, sheetsStatuses] = await Promise.all([
      validateYamlEnumConsistency(),
      validateDatabaseStatusValues(),
      getSheetsStatusValues()
    ]);
    
    // 結果レポート出力
    printValidationReport(yamlEnumResult, databaseResult, sheetsStatuses);
    
    // 自動修正提案
    await suggestAutoFix(yamlEnumResult, databaseResult);
    
    console.log(`\n✅ チェック完了`);
    
    // 不整合がある場合は非0で終了
    const hasIssues = !yamlEnumResult.isValid || !databaseResult.isValid;
    if (hasIssues) {
      console.log(`\n⚠️  整合性の問題が検出されました。上記の推奨アクションを実行してください。`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
} 