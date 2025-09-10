# Serena MCP サーバー セットアップガイド

## 概要
このガイドでは、CursorでSerena MCPサーバーを使用するためのセットアップ手順を説明します。

## 前提条件
- Python 3.11以上
- Node.js と npm/pnpm
- Cursor IDE

## 手順

### 1. Visual C++ Build Tools のインストール

Serenaの依存関係（psutil、tiktoken等）をビルドするために、Visual C++ Build Toolsが必要です。

#### 方法1: Visual Studio Build Tools をインストール
1. [Visual Studio Downloads](https://visualstudio.microsoft.com/downloads/) にアクセス
2. "Build Tools for Visual Studio 2022" をダウンロード
3. インストーラーを実行し、"C++ build tools" を選択
4. インストール完了後、コマンドプロンプトを再起動

#### 方法2: winget を使用（推奨）
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

### 2. Serena のインストール

```bash
# GitHubから直接インストール
pip install git+https://github.com/oraios/serena.git
```

### 3. TypeScript Language Server のインストール

```bash
pnpm add --save-dev typescript-language-server typescript
```

### 4. Cursor の設定

`.cursor/settings.json` ファイルが既に作成されています：

```json
{
  "mcpServers": {
    "serena": {
      "command": "python",
      "args": ["-m", "serena_agent.mcp_server"],
      "env": {
        "SERENA_PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

### 5. Serena の設定

`.serena/config.yaml` ファイルが既に作成されています。

### 6. 動作確認

```bash
# テストスクリプトを実行
python test-serena-mcp.py
```

## トラブルシューティング

### エラー: "Microsoft Visual C++ 14.0 or greater is required"

**解決方法:**
1. Visual C++ Build Tools をインストール
2. コマンドプロンプトを再起動
3. Serena を再インストール

### エラー: "No module named 'serena_agent'"

**解決方法:**
1. Serena が正しくインストールされているか確認
2. Python 環境を確認
3. 必要に応じて再インストール

### Cursor で MCP サーバーが認識されない

**解決方法:**
1. Cursor を再起動
2. `.cursor/settings.json` の設定を確認
3. パスが正しいか確認

## 使用方法

### Cursor での使用
1. Cursor を起動
2. プロジェクトを開く
3. チャットでSerenaの機能を使用

### 利用可能なツール
- コード検索・編集
- ファイル操作
- シンボル検索
- メモリ管理
- プロジェクト管理

## 参考リンク
- [Serena GitHub](https://github.com/oraios/serena)
- [MCP プロトコル](https://modelcontextprotocol.io/)
- [Cursor MCP サポート](https://cursor.sh/docs/mcp) 