import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

// ブラウザ用のFirebase設定（必須値: apiKey, projectId, appId）
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      ? `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`
      : undefined),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'venus-ark-aix',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

// 必須キーが不足している場合は警告（オフライン動作や接続失敗の原因になる）
if (typeof window !== 'undefined') {
  const missing: string[] = [];
  if (!firebaseConfig.apiKey) missing.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!firebaseConfig.appId) missing.push('NEXT_PUBLIC_FIREBASE_APP_ID');
  if (!firebaseConfig.projectId) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      '[Firebase] 不完全なクライアント設定です。以下の環境変数を .env.local に設定してください: ',
      missing.join(', ')
    );
  }
}

// Firebase アプリの初期化（重複初期化を防ぐ）
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ネットワーク環境によっては long polling が必要になるため auto-detect を有効化
// initializeFirestore は複数回実行しても同一アプリでは一度だけ適用される
if (typeof window !== 'undefined') {
  try {
    initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      experimentalAutoDetectLongPolling: true,
    } as any);
  } catch (_) {
    // すでに初期化済みの場合などは無視
  }
}

// Firestore インスタンスの取得
export const db = getFirestore(app);

export default app; 