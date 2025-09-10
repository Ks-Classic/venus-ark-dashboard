# Visual C++ Build Tools インストールスクリプト
# このスクリプトは、Serena MCPサーバーの依存関係をビルドするために必要な
# Visual C++ Build Toolsをインストールします。

param(
    [switch]$Force,
    [switch]$SkipConfirmation
)

Write-Host "Visual C++ Build Tools インストールスクリプト" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# 既存のインストールをチェック
Write-Host "既存のインストールをチェック中..." -ForegroundColor Yellow

# Visual Studio Build Tools のチェック
$vsBuildTools = Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "*Visual Studio*Build Tools*" }
if ($vsBuildTools) {
    Write-Host "✅ Visual Studio Build Tools が見つかりました:" -ForegroundColor Green
    foreach ($tool in $vsBuildTools) {
        Write-Host "  - $($tool.Name) (Version: $($tool.Version))" -ForegroundColor White
    }
}

# Visual C++ コンパイラのチェック
$clPath = Get-Command cl -ErrorAction SilentlyContinue
if ($clPath) {
    Write-Host "✅ Visual C++ コンパイラ (cl.exe) が見つかりました: $($clPath.Source)" -ForegroundColor Green
} else {
    Write-Host "❌ Visual C++ コンパイラ (cl.exe) が見つかりません" -ForegroundColor Red
}

# リンカーのチェック
$linkPath = Get-Command link -ErrorAction SilentlyContinue
if ($linkPath) {
    Write-Host "✅ リンカー (link.exe) が見つかりました: $($linkPath.Source)" -ForegroundColor Green
} else {
    Write-Host "❌ リンカー (link.exe) が見つかりません" -ForegroundColor Red
}

# 環境変数のチェック
$vcvarsPath = $env:VCINSTALLDIR
if ($vcvarsPath) {
    Write-Host "✅ Visual C++ 環境変数が設定されています: $vcvarsPath" -ForegroundColor Green
} else {
    Write-Host "❌ Visual C++ 環境変数が設定されていません" -ForegroundColor Red
}

# 必要なツールがすべて揃っているかチェック
if ($clPath -and $linkPath -and $vcvarsPath) {
    Write-Host ""
    Write-Host "✅ Visual C++ Build Tools は正しくインストールされています！" -ForegroundColor Green
    Write-Host "Serena のインストールを続行できます。" -ForegroundColor White
    exit 0
}

Write-Host ""
Write-Host "⚠️  Visual C++ Build Tools が不完全です。" -ForegroundColor Yellow

# wingetが利用可能かチェック
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "❌ winget が見つかりません。Windows 10 1803以降が必要です。" -ForegroundColor Red
    Write-Host "手動でインストールしてください: https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Yellow
    exit 1
}

# 確認
if (-not $SkipConfirmation) {
    Write-Host ""
    Write-Host "Visual C++ Build Tools をインストールしますか？" -ForegroundColor Cyan
    Write-Host "このインストールには数分かかる場合があります。" -ForegroundColor Yellow
    $response = Read-Host "続行しますか？ (y/N)"
    
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "インストールをキャンセルしました。" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "Visual C++ Build Tools をインストール中..." -ForegroundColor Green
Write-Host "この処理には数分かかる場合があります。" -ForegroundColor Yellow

try {
    # wingetを使用してインストール
    Write-Host "winget を使用してインストール中..." -ForegroundColor Yellow
    $result = winget install Microsoft.VisualStudio.2022.BuildTools --accept-source-agreements --accept-package-agreements
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Visual C++ Build Tools のインストールが完了しました！" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  重要: 環境変数を更新するために、コマンドプロンプト/PowerShellを再起動してください。" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "次のステップ:" -ForegroundColor Cyan
        Write-Host "1. このウィンドウを閉じて、新しいコマンドプロンプト/PowerShellを開いてください" -ForegroundColor White
        Write-Host "2. プロジェクトディレクトリに移動してください" -ForegroundColor White
        Write-Host "3. Serenaを再インストールしてください: .\scripts\install-serena.ps1" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ インストール中にエラーが発生しました。" -ForegroundColor Red
        Write-Host "手動でインストールしてください: https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ インストール中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "手動でインストールしてください: https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Yellow
    exit 1
} 