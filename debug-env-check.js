// 環境変数の確認
console.log('🔍 環境変数の確認');

console.log('\n=== GOOGLE_SERVICE_ACCOUNT_KEY ===');
const googleKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (googleKey) {
  try {
    const parsed = JSON.parse(googleKey);
    console.log('✅ JSON形式として有効');
    console.log('📋 含まれるキー:', Object.keys(parsed));
    console.log('📧 client_email:', parsed.client_email ? '✅ 存在' : '❌ 存在しない');
    console.log('🆔 project_id:', parsed.project_id ? '✅ 存在' : '❌ 存在しない');
  } catch (error) {
    console.log('❌ JSON解析エラー:', error.message);
    console.log('📝 最初の100文字:', googleKey.substring(0, 100));
  }
} else {
  console.log('❌ GOOGLE_SERVICE_ACCOUNT_KEY が設定されていません');
}

console.log('\n=== FIREBASE_SERVICE_ACCOUNT_KEY ===');
const firebaseKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (firebaseKey) {
  try {
    const parsed = JSON.parse(firebaseKey);
    console.log('✅ JSON形式として有効');
    console.log('📋 含まれるキー:', Object.keys(parsed));
    console.log('📧 client_email:', parsed.client_email ? '✅ 存在' : '❌ 存在しない');
    console.log('🆔 project_id:', parsed.project_id ? '✅ 存在' : '❌ 存在しない');
  } catch (error) {
    console.log('❌ JSON解析エラー:', error.message);
    console.log('📝 最初の100文字:', firebaseKey.substring(0, 100));
  }
} else {
  console.log('❌ FIREBASE_SERVICE_ACCOUNT_KEY が設定されていません');
}

console.log('\n=== .env.local ファイルの確認 ===');
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log('✅ .env.local ファイルが存在します');
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const lines = envContent.split('\n');
  console.log('📄 行数:', lines.length);
  console.log('🔑 GOOGLE_SERVICE_ACCOUNT_KEY:', lines.some(line => line.startsWith('GOOGLE_SERVICE_ACCOUNT_KEY')) ? '✅ 存在' : '❌ 存在しない');
  console.log('🔑 FIREBASE_SERVICE_ACCOUNT_KEY:', lines.some(line => line.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY')) ? '✅ 存在' : '❌ 存在しない');
} else {
  console.log('❌ .env.local ファイルが存在しません');
}

console.log('\n=== JSON ファイルの確認 ===');
const jsonPath = path.join(process.cwd(), 'venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json');
if (fs.existsSync(jsonPath)) {
  console.log('✅ Firebase認証JSONファイルが存在します');
  try {
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const parsed = JSON.parse(jsonContent);
    console.log('📋 含まれるキー:', Object.keys(parsed));
    console.log('📧 client_email:', parsed.client_email ? '✅ 存在' : '❌ 存在しない');
    console.log('🆔 project_id:', parsed.project_id ? '✅ 存在' : '❌ 存在しない');
  } catch (error) {
    console.log('❌ JSON解析エラー:', error.message);
  }
} else {
  console.log('❌ Firebase認証JSONファイルが存在しません');
}

console.log('\n✅ 環境変数確認完了'); 