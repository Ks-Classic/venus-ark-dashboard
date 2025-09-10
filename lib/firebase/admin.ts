import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
// import path from 'path'; // pathモジュールはもう不要なためコメントアウトまたは削除
// import fs from 'fs'; // fsモジュールはもう不要なためコメントアウトまたは削除

let cachedAdminDb: Firestore | null = null;

export function initializeFirebaseAdmin(): void {
  if (getApps().length === 0) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.error("FIREBASE_SERVICE_ACCOUNT_KEY 環境変数が設定されていません。");
      throw new Error("Firebase Admin SDK サービスアカウントキーが未設定です。");
    }
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("[DEBUG] Firebase Admin SDK initialized from environment variable.");
    } catch (error) {
      console.error("FIREBASE_SERVICE_ACCOUNT_KEY のパースに失敗しました:", error);
      console.error("パースしようとした文字列の先頭100文字:", process.env.FIREBASE_SERVICE_ACCOUNT_KEY.substring(0, 100));
      console.error("パースしようとした文字列の末尾100文字:", process.env.FIREBASE_SERVICE_ACCOUNT_KEY.substring(process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length - 100));
      throw new Error("Firebase Admin SDK サービスアカウントキーの形式が不正です。JSONが正しい形式であることを確認してください。特に、private_key内の改行文字は\\nとエスケープする必要があります。");
    }
  }
}

export function getAdminDb(): Firestore {
  // Firebase Admin SDKが初期化されていない場合は初期化する
  if (getApps().length === 0) {
    initializeFirebaseAdmin();
  }
  
  if (!cachedAdminDb) {
    cachedAdminDb = getFirestore();
    console.log('[DEBUG] Firestore instance created.');
  }
  return cachedAdminDb;
}

export default getAdminDb; 