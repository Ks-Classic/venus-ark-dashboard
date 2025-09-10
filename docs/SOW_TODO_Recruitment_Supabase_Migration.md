# SOW TODO: 採用領域 Supabase再構築・移行トラッカー

> このファイルは作業の進捗をチェックボックスで管理します。各タスクは Description / Action / Result / Next を都度更新します。

## 0. 進行ルール
- [x] 変更は必ずブランチで実施し、粒度の小さいコミットを作成
- [x] 進捗は本ファイルに追記（都度コミット）
- [x] 週次同期は選択週のみ反映する方針

---

## A. 仕様整備
- [x] Supabase再構築の提案・要件・設計を作成
  - Description: なぜFirestore→Supabaseか、DDL/RLS/集計SQL、移行計画
  - Action: `docs/specifications/Supabase_Recruitment_Rebuild_Spec.md` 追加
  - Result: コミット済（設計合意用の基盤）
  - Next: PoCブランチで接続実装

- [x] UI項目→シート列/処理の対応表を作成
  - Description: 各メトリクスのシート列と計算ルール
  - Action: `docs/specifications/Recruitment_Report_Metrics_Mapping.md` 追加
  - Result: コミット済
  - Next: 列名揺れの追加確認

- [x] 項目別フロー（Sheets→Supabase→Report）整理
  - Description: フロー/ETL/週次集計と同期ボタン動作
  - Action: `docs/specifications/Recruitment_PerMetric_Flow_Spec.md` 追加
  - Result: 書類提出はフォーム優先に修正済
  - Next: 実装と同値性テスト

---

## B. 実装・PoC
- [x] Supabase接続と機能フラグ導入（RECRUITMENT_DB）
  - Description: `@supabase/supabase-js` 導入・クライアント/サーバ接続の雛形
  - Action: env.exampleにSUPABASE系とRECRUITMENT_DBを追加／`lib/supabase/client.ts`／`lib/config/recruitment-db.ts` を新規作成／`weekly-reports` APIにDB種別ログ
  - Result: ブランチ `feat/supabase-flag-client` にコミット済
  - Next: スキーマ適用へ

- [x] スキーマ/ポリシー適用（DDL/RLS）
  - Description: applications / weekly_reports / recruitment_detail_items を作成
  - Action: `supabase/schema/recruitment.sql` を追加（DDL/Index/RLS/Policy）
  - Result: コミット済（SQLをSupabaseに適用すればDB準備完了）
  - Next: ETL実装へ

- [x] ETL（選択週のみ）: Sheets→applications upsert
  - Description: 応募日フィルタ、フォーム名寄せ、型統一
  - Action: `lib/supabase/recruitment-etl.ts` を追加し、`/api/recruitment/sync-week` でフラグに応じてSupabase/Firestoreへupsert
  - Result: フラグ `RECRUITMENT_DB=supabase` で選択週の応募をSupabaseへ投入可能
  - Next: 週次レポート生成（Supabase版）

- [x] 週次レポート生成（SQL or サービス実装）
  - Description: 職種別→合算の週次メトリクス作成
  - Action: `lib/supabase/weekly-reports.ts` を追加し、Supabaseから週範囲集計（フォーム下限を考慮）
  - Result: Supabase選択時に週次メトリクスが算出可能
  - Next: API差し替えへ

- [x] weekly-reports API をSupabase読取に差替（レスポンス互換）
  - Description: 既存の `GET /api/recruitment/weekly-reports` を内部切替
  - Action: `app/api/recruitment/weekly-reports/route.ts` で `RECRUITMENT_DB` に応じて Supabase/Firestore で再集計し upsert
  - Result: 空スナップショット時にSupabaseで集計・保存・返却可能
  - Next: UI再取得確認

- [ ] コメント機能の移行（recruitment_detail_items）
  - Description: CRUDとRLS、SWR/Realtime
  - Action: 予定
  - Result:
  - Next: 完了判定

---

## C. 検証・ローンチ
- [ ] 同値性テスト（複数週・職種）
  - Description: 旧Firestoreと新Supabaseの数値一致確認
  - Action: 予定
  - Result:
  - Next: 差分の原因分析

- [ ] パフォーマンス検証 / インデックス最適化
  - Description: 実行計画確認と必要indexの追加
  - Action: 予定
  - Result:
  - Next: 本番切替判断

- [ ] 本番切替（RECRUITMENT_DB=supabase）
  - Description: フラグ切替と監視
  - Action: 予定
  - Result:
  - Next: 監視運用
