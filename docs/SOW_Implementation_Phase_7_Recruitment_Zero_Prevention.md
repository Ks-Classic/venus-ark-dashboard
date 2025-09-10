# SOW: 採用ダッシュボード「ゼロ防止」恒久対策 (Phase 7)

## 1. 背景と目的
- 週次レポートが0になる事象が断続的に発生。
- 主な要因:
  - 保存キー(year, weekNumber)とAPIクエリ(月内週)の不整合
  - 週跨ぎイベント（書類提出/面談/採用/受諾等）を応募日週で集計→実績が0
  - `weekly_reports`未生成の週が存在
  - Firestoreインデックス不足でクエリ不能
- 目的: ゼロ発生の未然防止・即時復旧・原因可視化を同時達成する。

## 2. スコープ
- API (`app/api/recruitment/weekly-reports/route.ts`)
  - 空スナップショット時にその場で再集計→Firestoreへupsert→月週情報を付与して返却
  - リクエスト/週変換/クエリ結果/サニティ/再集計/保存の詳細ログ出力
- 集計 (`lib/analytics/weekly-aggregation.ts`)
  - 各ステージを該当日付フィールド/`updatedAt`で週範囲集計（応募日週に限定しない）
- インデックス (`firestore.indexes.json`)
  - `applications`: 各日付フィールド+`jobCategory`、`status+updatedAt`(+`jobCategory`)
  - `weekly_reports`: `(reportType, year, weekNumber)`(+`jobCategory`)

## 3. 受け入れ基準
- `weekly_reports`が無い週でもAPIが自動再集計し保存、UIに数値が表示される
- 週跨ぎイベントも週範囲に入ればカウントされる
- devターミナルに詳細ログが出力され、原因を切り分け可能
- Firestoreインデックス警告が解消される

## 4. 実装サマリ（完了）
- API: 空時の再集計・保存・返却、詳細ログ追加
- 集計: 週範囲横断カウントを導入
- インデックス: `applications`/`weekly_reports`の複合インデックスを追加

## 5. 運用/リリース
- インデックス反映（PowerShell）
  - 例: `npx firebase-tools deploy --only firestore:indexes --project venus-ark-aix --non-interactive`
- 監視
  - 空スナップショット発生時、サニティ結果と再集計/保存ログを確認
- 将来拡張
  - Cloud Schedulerで週締め後の自動生成を追加し、初回アクセス前に作成
