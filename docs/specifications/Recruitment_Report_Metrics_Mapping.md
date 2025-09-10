# 採用ダッシュボード 集計項目 ↔ スプレッドシート列・処理ルール

このドキュメントは、UIに表示する各メトリクスが、どのスプレッドシート列（または列群）から、どのような処理・計算で導出されるかを定義します。対象は既存の同期実装（`scripts/sync-recruitment-data.ts` と `lib/data-processing/validation.ts`）と週次集計（`lib/analytics/weekly-aggregation.ts`）。

## 1. 対象シートと共通事項
- 対象シート（例）
  - `indeed応募者管理(SNS運用)` / `engageその他応募者管理(SNS運用)`
  - `indeed応募者管理(動画編集)` / `engageその他応募者管理(動画編集)`
  - `indeed応募者管理(ライター/AIライター)` / `engageその他応募者管理(ライター/AIライター)`
  - `indeed応募者管理(撮影スタッフ)` / `engageその他応募者管理(撮影スタッフ)`
- 職種の判定: シート名に含まれる文字列で `JobCategory` を決定。
- 行→`ApplicationInput` の変換で使用する代表列（エイリアス含む）
  - 氏名: `氏名` or `名前`
  - 応募日: `応募日` or `応募日時`
  - ステータス: `ステータス` or `選考状況`
  - 書類提出日: `書類提出日`/`書類提出`/`提出日`/`フォーム提出日`/`書類提出日時`/`提出日時`/`書類提出完了日`/`書類提出完了`
  - 面接予定日: `面接日1`/`面接日時`/`面談予定日時`/`面談日時`/`一次面談日`/`一次面接日`/`面談日`/`面接日`/`面接予定日`/`面談予定日`/`面接予定`/`面談予定`/`面接スケジュール`/`面談スケジュール`
  - 面接実施日: `面接実施日`/`面談実施日`/`実施日`/`面談実施`/`面接完了日`/`面談完了日`/`面接実施日時`/`面談実施日時`/`面接実施`/`面談実施`/`面接完了`/`面談完了`
  - 採用日: `採用日`/`入社日`/`採用決定日`/`採用決定`/`採用完了日`/`採用日時`/`採用確定日`/`採用確定`
  - 内定受諾日: `内定受諾日`/`内定承諾日`/`承諾日`/`受諾日`/`内定受諾`/`内定承諾`/`受諾完了日`/`内定受諾完了`/`内定承諾完了`/`受諾確定日`
  - 辞退日: `辞退日`/`辞退日時`/`辞退確定日`/`辞退完了日`
  - 不採用理由: `不採用理由`/`辞退理由`（集計は `rejectionReason` を小文字化して分類）
- 書類提出の補完: 応募者の正規化氏名でエントリーフォーム（`ENTRY_FORM_SPREADSHEET_ID`）の `タイムスタンプ` を突合し、`documentSubmitted` の下限値とする（フォーム提出があれば少なくとも提出者として扱う）。
- 週の定義: 週開始=土曜、週終了=金曜。UIからの `year, month, weekInMonth` はAPIで `(year, weekNumber)` に変換。

## 2. UIテーブル: 集客（応募フェーズ）
- 表示項目: 応募数 / 応募内不採用数 / 選考継続数（応募） / 書類提出数 / 書類内不採用数 / 選考継続数（書類）
- 週範囲: 対象週の土曜〜金曜。

1) 応募数 `applyCount`
- 定義: 対象週に `application_date` が属する応募者の件数
- シート列: 応募日（`応募日` or `応募日時`）
- 処理: `applications` から `applicationDate between [start,end]` をカウント

2) 応募内不採用数 `applyRejectCount`
- 定義: 対象週に `updatedAt` が属し、`status='応募落ち'` の件数
- シート列: ステータス（`ステータス`/`選考状況`）
- 処理: 週範囲×`status='応募落ち'` を `updatedAt` でカウント

3) 選考継続数（応募） `applyContinueCount`
- 定義: 対象週の応募者集合のうち、ステータスが未クローズ（`採用/不採用/辞退/離脱/応募落ち/書類落ち/採用辞退/面談不参加/内定受諾` 以外）
- シート列: ステータス
- 処理: 応募週集合から未クローズ件数を算出

4) 書類提出数 `documentSubmitted`
- 定義: 対象週に `documentSubmitDate` または エントリーフォーム `タイムスタンプ` が属する件数
- シート列: 書類提出（エイリアス群）
- 処理: `documentSubmitDate between [start,end]` をカウント。0件時はフォーム `タイムスタンプ between [start,end]` の件数で補完（下限値）

5) 書類内不採用数 `documentRejectCount`
- 定義: 対象週に `updatedAt` が属し、`status='書類落ち'` の件数
- シート列: ステータス
- 処理: 週範囲×`status='書類落ち'` を `updatedAt` でカウント

6) 選考継続数（書類） `documentContinueCount`
- 定義: 最低でも `documentSubmitted` を下限値とする継続数
- 処理: `documentContinueCount = max(documentContinueCount(関数計算), documentSubmitted)`

## 3. UIテーブル: 面接（選抜フェーズ）
- 表示項目: 面接予定数 / 面接実施数 / 内定受諾数 / 採用者数

1) 面接予定数 `interviewScheduled`
- 定義: 対象週に `interviewDate` が属する件数
- シート列: 面接予定（エイリアス群）
- 処理: `interviewDate between [start,end]` をカウント

2) 面接実施数 `interviewConducted`
- 定義: 対象週に `interviewImplementedDate` が属する件数
- シート列: 面接実施（エイリアス群）
- 処理: `interviewImplementedDate between [start,end]` をカウント

3) 採用者数 `hireCount`
- 定義: 対象週に `hireDate` が属する件数
- シート列: 採用日（エイリアス群）
- 処理: `hireDate between [start,end]` をカウント

4) 内定受諾数 `offerAcceptedCount`
- 定義: 対象週に `acceptanceDate` が属する件数
- シート列: 内定受諾日（エイリアス群）
- 処理: `acceptanceDate between [start,end]` をカウント

5) 率（UI表示）
- 面接実施率 `interviewRate = round((interviewConducted / interviewScheduled) * 100, 1)`（分母0は0%）
- 内定受諾率 `acceptanceRate = round((offerAcceptedCount / hireCount) * 100, 1)`（分母0は0%）

## 4. UIテーブル: 不採用者内訳
- 表示項目: 経験者 / 高齢 / 不適合 / 外国籍 / 転居確認 / 内定後辞退 / その他
- 定義: 対象週に `updatedAt between [start,end]` かつ `status='不採用'` の応募の `rejectionReason` を小文字化分類
- シート列: `不採用理由`/`辞退理由`（自由記述を含む）
- 正規化ルール（小文字化して一致）
  - `experienced`, `elderly`, `unsuitable`, `foreign`, `relocation_check`, `post_offer_withdrawal`, その他は `other`

## 5. スプレッドシート→アプリ変換の主なロジック（参考実装）
- `lib/data-processing/validation.ts`
  - 列エイリアスの広範な対応（項目名ブレの吸収）
  - `応募日`/`応募日時` のパース、`ステータス`/`選考状況`のマッピング
  - 書類/面接/採用/受諾/辞退の各日付のパースと `Timestamp` 化
  - `不採用理由` の取り込み（自由記述→集計側で正規化）
- `lib/analytics/weekly-aggregation.ts`
  - 応募集合ベースの継続指標 + 範囲クエリによる実績系を統合
  - `documentSubmitted` のフォーム補完（0件時の下限反映）

## 6. 仕様の確認ポイント（運用）
- ヘッダー名が変化した場合はエイリアス配列に追加する
- `不採用理由` の表記ゆれは、正規化対象を追加し運用ガイドに追記
- 月跨ぎ週の解釈は UI/API/集計で統一（週の開始=土曜）

---
この仕様に従えば、ダッシュボードの各数値はスプレッドシートのどの列から、どの範囲・条件で算出されるかが一意に追跡できます。
