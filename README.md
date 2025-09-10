# Venus Ark Dashboard

Venus Arkの採用・稼働者管理のための統合ダッシュボードシステム

## 🚨 エラー解決ガイド

### 1. Firebase Admin SDK初期化エラーの解決 ✅
Firebase Admin SDKの初期化エラーは修正済みです。`getAdminDb()`関数で自動的に初期化されるようになりました。

### 2. Notion API認証エラーの解決
以下の手順でNotion APIトークンを設定してください：

1. [Notion Integrations](https://www.notion.so/my-integrations)にアクセス
2. 「新しいインテグレーション」をクリック
3. 「Venus Ark Dashboard」という名前でインテグレーションを作成
4. 生成された「Internal Integration Token」をコピー
5. `.env.local`ファイルに以下を追加：
```
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Notion データベースへのアクセス権限設定
各Notionデータベースでインテグレーションを招待する必要があります：

1. Notionで対象のデータベースページを開く
2. 右上の「...」メニューから「接続」を選択
3. 「Venus Ark Dashboard」を検索して追加
4. 以下のデータベースで同じ手順を繰り返す：
   - メンバーDB
   - 案件DB
   - メンバー別案件状況管理DB

## 🚀 Serena MCP サーバー セットアップ

このプロジェクトでは、CursorでSerena MCPサーバーを使用して高度なコード編集機能を利用できます。

### クイックセットアップ

PowerShellで以下のコマンドを実行してください：

```powershell
# セットアップスクリプトを実行
.\scripts\install-serena.ps1
```

### 手動セットアップ

詳細な手順は [docs/serena-setup-guide.md](docs/serena-setup-guide.md) を参照してください。

### 主な機能

- **セマンティックコード検索**: 意味に基づいたコード検索
- **インテリジェント編集**: AIによる自動コード編集
- **プロジェクト管理**: ファイル構造の理解と管理
- **メモリ機能**: プロジェクト固有の情報を記憶

### 使用方法

1. Cursorを再起動
2. プロジェクトを開く
3. チャットでSerenaの機能を使用

## 環境変数設定

`.env.local`ファイルに以下の環境変数を設定してください：

```bash
# Notion API
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_MEMBER_DB_ID=your-member-database-id
NOTION_PROJECT_DB_ID=your-project-database-id
NOTION_MEMBER_PROJECT_STATUS_DB_ID=your-member-project-status-database-id

# 既存の環境変数（設定済みの場合はそのまま）
# ... 他の環境変数 ...
```

## プロジェクト概要

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/yasuhikokohata-gmailcoms-projects/v0-venus-ark](https://vercel.com/yasuhikokohata-gmailcoms-projects/v0-venus-ark)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/ZWy4vUKNt2S](https://v0.dev/chat/projects/ZWy4vUKNt2S)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
