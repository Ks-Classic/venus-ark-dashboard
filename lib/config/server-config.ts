// lib/config/server-config.ts

/**
 * このファイルは、サーバーサイドでのみ使用される環境変数を管理します。
 * Next.jsはビルド時と実行時に.env.localを自動的に読み込むため、
 * このファイルがインポートされるタイミングで環境変数が検証されます。
 * 
 * もしここでエラーが発生する場合、原因はほぼ以下のいずれかです:
 * 1. .env.local ファイルに該当の環境変数が定義されていない。
 * 2. .env.local ファイルを変更した後に、開発サーバーが再起動されていない。
 * 3. Vercelなどの本番環境で、環境変数が正しく設定されていない。
 */

export const NOTION_TOKEN = process.env.NOTION_TOKEN;
export const NOTION_MEMBER_DB_ID = process.env.NOTION_MEMBER_DB_ID;
export const NOTION_PROJECT_DB_ID = process.env.NOTION_PROJECT_DB_ID;
export const NOTION_MEMBER_PROJECT_STATUS_DB_ID = process.env.NOTION_MEMBER_PROJECT_STATUS_DB_ID;

if (!NOTION_TOKEN) {
  throw new Error(
    "環境変数 'NOTION_TOKEN' が設定されていません。.env.localを確認し、開発サーバーを再起動してください。"
  );
}

if (!NOTION_MEMBER_DB_ID) {
  throw new Error(
    "環境変数 'NOTION_MEMBER_DB_ID' が設定されていません。.env.localを確認し、開発サーバーを再起動してください。"
  );
}
