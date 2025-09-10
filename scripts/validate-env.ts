#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { resolve } from 'path';

// .env.localファイルを読み込み
config({ path: resolve(__dirname, '../.env.local') });

interface EnvValidation {
  name: string;
  required: boolean;
  value: string | undefined;
  valid: boolean;
  message: string;
}

const requiredEnvVars: Array<{ name: string; pattern?: RegExp; description: string }> = [
  { name: 'SUPABASE_URL', pattern: /^https:\/\/.*\.supabase\.co$/, description: 'SupabaseプロジェクトURL' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', pattern: /^eyJ/, description: 'Supabaseサービスロールキー' },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', pattern: /^https:\/\/.*\.supabase\.co$/, description: 'ブラウザ用Supabase URL' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', pattern: /^eyJ/, description: 'ブラウザ用匿名キー' },
  { name: 'RECRUITMENT_DB', description: '採用DB選択' },
  { name: 'MAIN_RECRUITMENT_SPREADSHEET_ID', description: 'メイン採用管理シートID' },
  { name: 'ENTRY_FORM_SPREADSHEET_ID', description: '応募フォームシートID' }
];

function validateEnvVar(name: string, pattern?: RegExp): EnvValidation {
  const value = process.env[name];
  const required = requiredEnvVars.some(v => v.name === name);
  
  if (!value) {
    return {
      name,
      required,
      value: undefined,
      valid: !required,
      message: required ? '❌ 必須項目が設定されていません' : '⚠️ 設定されていません（オプション）'
    };
  }

  if (pattern && !pattern.test(value)) {
    return {
      name,
      required,
      value,
      valid: false,
      message: '❌ 形式が正しくありません'
    };
  }

  return {
    name,
    required,
    value: value.length > 20 ? `${value.substring(0, 20)}...` : value,
    valid: true,
    message: '✅ 正常'
  };
}

function main() {
  console.log('🔍 環境変数検証開始\n');
  
  const results = requiredEnvVars.map(env => validateEnvVar(env.name, env.pattern));
  
  results.forEach(result => {
    const status = result.valid ? '✅' : (result.required ? '❌' : '⚠️');
    console.log(`${status} ${result.name}: ${result.message}`);
    if (result.value) {
      console.log(`   値: ${result.value}`);
    }
    console.log('');
  });

  const requiredValid = results.filter(r => r.required && r.valid).length;
  const requiredTotal = results.filter(r => r.required).length;
  
  console.log(`📊 検証結果: 必須項目 ${requiredValid}/${requiredTotal} が正常`);
  
  if (requiredValid === requiredTotal) {
    console.log('🎉 すべての必須環境変数が正しく設定されています！');
    process.exit(0);
  } else {
    console.log('⚠️ 一部の必須環境変数が設定されていません');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
