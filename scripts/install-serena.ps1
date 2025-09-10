# Serena MCP サーバー インストールスクリプト
# このスクリプトは、Serena MCPサーバーとその依存関係をインストールします。

param(
    [switch]$Force,
    [switch]$SkipConfirmation,
    [switch]$SkipBuildTools
)

Write-Host "Serena MCP サーバー インストールスクリプト" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Pythonが利用可能かチェック
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python が見つかりません。Python 3.11以上をインストールしてください。" -ForegroundColor Red
    exit 1
}

# Python バージョンをチェック
$pythonVersion = python --version 2>&1
Write-Host "Python バージョン: $pythonVersion" -ForegroundColor Cyan

# Visual C++ Build Tools のインストール
if (-not $SkipBuildTools) {
    Write-Host ""
    Write-Host "Visual C++ Build Tools のインストールをチェック中..." -ForegroundColor Yellow
    
    # 既にインストールされているかチェック
    $existing = winget list "Microsoft.VisualStudio.2022.BuildTools" 2>$null
    
    if (-not $existing) {
        Write-Host "Visual C++ Build Tools が必要です。" -ForegroundColor Yellow
        $response = Read-Host "インストールしますか？ (y/N)"
        
        if ($response -eq "y" -or $response -eq "Y") {
            Write-Host "Visual C++ Build Tools をインストール中..." -ForegroundColor Green
            & "$PSScriptRoot\install-build-tools.ps1" -SkipConfirmation
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Visual C++ Build Tools のインストールに失敗しました。" -ForegroundColor Red
                Write-Host "手動でインストールしてから再実行してください。" -ForegroundColor Yellow
                exit 1
            }
        } else {
            Write-Host "⚠️  Visual C++ Build Tools なしで続行します。インストールが失敗する可能性があります。" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ Visual C++ Build Tools は既にインストールされています。" -ForegroundColor Green
    }
}

# 既存のSerenaをアンインストール
if ($Force) {
    Write-Host ""
    Write-Host "既存のSerenaをアンインストール中..." -ForegroundColor Yellow
    pip uninstall serena-agent -y 2>$null
    pip uninstall serena -y 2>$null
}

# Serena のインストール
Write-Host ""
Write-Host "Serena MCP サーバーをインストール中..." -ForegroundColor Green
Write-Host "この処理には数分かかる場合があります。" -ForegroundColor Yellow

try {
    # GitHubから直接インストール
    $result = pip install git+https://github.com/oraios/serena.git
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Serena MCP サーバーのインストールが完了しました！" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Serena のインストール中にエラーが発生しました。" -ForegroundColor Red
        Write-Host "Visual C++ Build Tools がインストールされているか確認してください。" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Serena のインストール中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# TypeScript Language Server のインストール
Write-Host ""
Write-Host "TypeScript Language Server をインストール中..." -ForegroundColor Green

try {
    if (Test-Path "package.json") {
        # pnpmが利用可能かチェック
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm add --save-dev typescript-language-server typescript
        } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
            npm install --save-dev typescript-language-server typescript
        } else {
            Write-Host "⚠️  npm/pnpm が見つかりません。手動でインストールしてください。" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  package.json が見つかりません。手動でインストールしてください。" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  TypeScript Language Server のインストール中にエラーが発生しました。" -ForegroundColor Yellow
}

# 動作確認
Write-Host ""
Write-Host "動作確認中..." -ForegroundColor Green

if (Test-Path "test-serena-mcp.py") {
    python test-serena-mcp.py
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 セットアップが完了しました！" -ForegroundColor Green
        Write-Host ""
        Write-Host "次のステップ:" -ForegroundColor Cyan
        Write-Host "1. Cursor を再起動してください" -ForegroundColor White
        Write-Host "2. プロジェクトを開いてください" -ForegroundColor White
        Write-Host "3. チャットでSerenaの機能を使用してください" -ForegroundColor White
        Write-Host ""
        Write-Host "詳細は docs/serena-setup-guide.md を参照してください。" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "❌ 動作確認に失敗しました。" -ForegroundColor Red
        Write-Host "詳細は docs/serena-setup-guide.md のトラブルシューティングを参照してください。" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  テストスクリプトが見つかりません。" -ForegroundColor Yellow
    Write-Host "手動で動作確認してください。" -ForegroundColor Yellow
} 