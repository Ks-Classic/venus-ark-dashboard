const fs = require('fs');
const path = require('path');

// Firebase認証情報を読み込み
const firebaseKey = JSON.stringify(require('./venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json'));

// .env.localファイルの内容
const envContent = `# Firebase Admin SDK設定
FIREBASE_SERVICE_ACCOUNT_KEY=${firebaseKey}

# Google Sheets API設定（Firebase認証を使用）
GOOGLE_SERVICE_ACCOUNT_KEY=${firebaseKey}

# Next.js設定
NEXT_PUBLIC_FIREBASE_PROJECT_ID=venus-ark-aix

# 開発環境設定
NODE_ENV=development
`;

// .env.localファイルを作成
fs.writeFileSync('.env.local', envContent);
console.log('✅ .env.localファイルを作成しました');

// 確認
if (fs.existsSync('.env.local')) {
  console.log('✅ .env.localファイルが正常に作成されました');
  const content = fs.readFileSync('.env.local', 'utf8');
  console.log('📄 ファイルサイズ:', content.length, '文字');
  console.log('📋 行数:', content.split('\n').length);
} else {
  console.log('❌ .env.localファイルの作成に失敗しました');
} 