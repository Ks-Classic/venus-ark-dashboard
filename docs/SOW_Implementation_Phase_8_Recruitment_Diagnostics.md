### SOW: 採用レポート診断・完全整合化フェーズ（Phase 8）

目的
- 4つの問題を同時解決する恒久的な診断基盤を実装し、API/保存値/UI表示を完全整合させる
  - APIで取得している値が実態と違う
  - レポートに必要な項目が欠落
  - 画面表示値がAPI値と乖離
  - 画面に値が表示されない項目がある

スコープ（機能別タスク）
- 共通トレーシング（traceId/相関情報の貫通）
  - [x] `weekly-reports`/`sync`/`sync-week` に `X-Trace-Id` 付与（UIから参照可）
  - [x] 診断APIは `traceId` をレスポンスに含める
  - [ ] 他APIへの順次適用（optimized, weekly-summaries など）
  - [ ] `appendToLog` で JSON 構造のメタ（phase, durationMs）を出力

- 診断APIの新設（Reconcile）
  - [x] ルート実装済み: `GET /api/recruitment/diagnostics/reconcile?weekKey=...&jobCategory=...&debug=true`
  - [x] 出力: 三者比較と diff
  - [x] 付随診断: date範囲の string/Timestamp 混在検出（countByDateFieldRange）
  - [x] 受入を満たす

- 集計関数の差分ログ（応募集合 vs 範囲クエリ）
  - [x] 全指標で diff を構造ログ出力
  - [ ] 率の分母/分子/丸め前後をサーバー側でもログ（UI側は実装済）

- UI描画直前の整合チェック
  - [x] 合算・率の再計算/乖離チェック（UI）
  - [x] 未表示（undefined/null）の項目を検出し警告

- `jobCategory` 正規化の一本化
  - [x] 共通ユーティリティ実装（`lib/recruitment/category.ts`）
  - [x] `weekly-reports` に適用
  - [ ] 他APIへ順次適用

- インデックス Self-check（予防）
  - [x] API入口で必須インデックスのガイドを一度だけログ出力
  - [ ] 必須一覧: 
        - applications: jobCategory+applicationDate, jobCategory+documentSubmitDate, jobCategory+interviewDate, jobCategory+interviewImplementedDate, jobCategory+hireDate, jobCategory+acceptanceDate, status+updatedAt
        - weekly_reports: reportType+year+weekNumber, reportType+jobCategory+year+weekNumber

- 既存ログの拡張（すでに一部実装済み）
  - [x] 同期APIでのフィールド存在数（interview/hire/accept/理由/ステータス内訳）
  - [x] `weekly-reports` でヒット時サンプル・スナップショット空時のサニティ・再集計ログ
  - [x] 不採用理由の小文字化正規化
  - [x] date範囲集計で string/Timestamp の二重集計とサンプル出力（0検知時は警告）
  - [x] 全指標で差分ログ追加

受け入れ基準（Acceptance Criteria）
- 任意週・職種で診断APIのレスポンスに以下が含まれる
  - [ ] applications直接集計、集計関数、weekly_reports保存値の三者比較と diff
  - [ ] 日付フィールド型分布、status/updatedAt分布、未対応のrejectionReason
  - [ ] インデックス欠落の有無（欠落時は推奨定義）
- UIの合計値とAPI合計値が一致（丸め仕様込み）。乖離時は UI 警告に `traceId` と対象フィールドが表示される
- 同期→再読込の1トレースで、0化/欠落/乖離の発生工程が特定できる（phaseと diff が揃う）

アウトプット（Deliverables）
- `api/recruitment/diagnostics/reconcile` ルート
- ログ強化（工程別構造化ログと diff 出力）
- UIの整合チェック（描画前差分）
- インデックス Self-check（起動/同期）
- ドキュメント: 運用ガイド・トラブルシューティング

実行手順（PowerShell / Windows）
```powershell
# 開発サーバ（デバッグ有効・ポート8080）
cross-env RECRUITMENT_DEBUG=true PORT=8080 pnpm dev

# ビルド（Node 20 LTS 推奨）
pnpm build
```

プラン（マイルストーン）
1. 相関IDの貫通とログ骨格（0.5d）
2. 診断APIの実装（1.0d）
3. 集計関数の差分ログ全指標化（0.5d）
4. UI整合チェック（0.5d）
5. インデックス Self-check（0.5d）
6. ドキュメントと検証（0.5d）

リスク/対策
- 既存データの型混在（string/Timestamp）
  - 診断で自動検出 → マイグレーションスクリプトを提示
- インデックス反映の待ち時間
  - Self-check で先に不足を検知し、実行順序をガイド

進捗用TODO（チェックリスト）
- [ ] TraceId/phaseの貫通
- [ ] Reconcile API 実装
- [ ] 集計関数の差分ログ（全指標）
- [ ] UI描画前の整合チェック（合計/率/未表示）
- [ ] jobCategory正規化の一本化
- [ ] インデックス Self-check
- [ ] ドキュメント追記と運用ガイド


