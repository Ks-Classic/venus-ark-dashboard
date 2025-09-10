# GAS中心の採用活動ダッシュボード実装手順書

## 🎯 概要

Supabaseの複雑さを避け、Google Apps Script (GAS) を中心としたシンプルで確実な採用活動ダッシュボードを実装します。

## 📋 実装内容

### **1. 機能**
- ✅ 週次レポート生成
- ✅ Indeed/Engageフィルタ
- ✅ 職種フィルタ
- ✅ 全指標の計算・表示
- ✅ 既存UI/UXの完全維持

### **2. 技術構成**
- **フロントエンド**: Next.js + TypeScript
- **データ処理**: Google Apps Script (GAS)
- **データソース**: Google Spreadsheet
- **API**: Next.js API Routes

## 🚀 実装手順

### **Step 1: GASスクリプトの設定**

#### **1.1 GASプロジェクトの作成**
1. [Google Apps Script](https://script.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名: `採用活動レポート`

#### **1.2 コードの配置**
1. `gas/recruitment-complete.gs` の内容をコピー
2. GASエディタの `Code.gs` に貼り付け
3. `gas/FilteredReportDialog.html` の内容をコピー
4. GASエディタで「+」→「HTML」で新規ファイル作成
5. ファイル名: `FilteredReportDialog`
6. 内容を貼り付け

#### **1.3 GASスクリプトIDの取得**
1. GASエディタで「デプロイ」→「新しいデプロイ」
2. 種類: `ウェブアプリ`
3. 実行: `自分`
4. アクセス: `全員`
5. デプロイ実行
6. 表示されるURLからスクリプトIDを抽出

### **Step 2: Next.js APIの設定**

#### **2.1 スクリプトIDの設定**
```typescript
// app/api/gas/recruitment/route.ts
const GAS_SCRIPT_ID = 'YOUR_ACTUAL_SCRIPT_ID_HERE';
```

#### **2.2 環境変数の設定**
```bash
# .env.local
GAS_SCRIPT_ID=your_actual_script_id_here
```

### **Step 3: フロントエンドの統合**

#### **3.1 フィルタコンポーネントの配置**
```typescript
// app/recruitment/page.tsx
import RecruitmentFilters from '@/components/recruitment/RecruitmentFilters';

// 既存のダッシュボードの上部に配置
<RecruitmentFilters onFiltersChange={handleFiltersChange} />
```

#### **3.2 データ取得ロジックの実装**
```typescript
const handleFiltersChange = async (filters: {
  weekSelector: string;
  platform: string;
  jobCategory: string;
}) => {
  try {
    const response = await fetch('/api/gas/recruitment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters),
    });
    
    const data = await response.json();
    if (data.success) {
      setRecruitmentData(data.metrics);
    }
  } catch (error) {
    console.error('データ取得エラー:', error);
  }
};
```

## 🔧 カスタマイズポイント

### **1. スプレッドシートの列名対応**
```typescript
// GAS内で実際の列名に合わせて調整
const headerMap = {};
headers.forEach((header, index) => {
  headerMap[header] = index;
});

// 例: 実際の列名に合わせて調整
const applicationDate = row[headerMap['応募日']] || row[headerMap['応募日時']];
const documentSubmitDate = row[headerMap['書類提出日']] || row[headerMap['書類提出日時']];
```

### **2. 週次計算ロジック**
```typescript
// 土曜日〜金曜日の週計算
function getWeekDateRange(weekSelector) {
  // 現在は2025年固定、必要に応じて動的化
  const year = 2025;
  // ... 週計算ロジック
}
```

### **3. 指標計算ロジック（更新）**
```typescript
// 応募系
// 応募内不採用=『応募落ち』のみをカウント（『不採用』は含めない）
const applyRejectCount = countIf(applicationsOfWeek, a => a.status === '応募落ち');
// 選考継続(応募)=『フォーム回答待ち』の実数
const applyContinueCount = countIf(applicationsOfWeek, a => a.status === 'フォーム回答待ち');

// 面接系は応募日のフィルタを外し、各列の週範囲で判定
const interviewScheduled = countIf(allApplications, a => inWeek(a.interview_date));
const interviewConducted = countIf(allApplications, a => inWeek(a.interview_implemented_date));
const interviewCancelled = countIf(allApplications, a => inWeek(a.interview_date) && ['面接不参加','面談不参加'].includes(a.status));
const hireCount = countIf(allApplications, a => inWeek(a.interview_implemented_date) && a.status === '採用');
const offerAcceptedCount = countIf(allApplications, a => inWeek(a.acceptance_date));

// 書類提出数はフォーム優先（タイムスタンプ）。
// 採用管理に提出日があれば名寄せ後に重複除外して合算（任意）
const documentSubmitted = countFormSubmissionsInWeek();

// 書類内不採用/選考継続(書類)
// 名寄せ無しモード: 提出件数を下限値とする
// 名寄せ有効モード: フォーム集合×採用管理で近傍一致しステータスで区分
```

### **4. 名寄せ（フォーム→採用管理）オプション**
氏名の表記ゆれ（例: 姓名の空白・全角/半角・かな/カナ）を吸収するため、GAS内で軽量な近傍一致を実装できます。

推奨手順:
1. 正規化関数を定義
```js
function normalizeName(name) {
  if (!name) return '';
  return name
    .toString()
    .replace(/[\s\u3000]/g, '') // 半角/全角スペース除去
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角→半角
    .toLowerCase();
}
```
2. 近傍一致（N-Gramのジャッカード類似度）
```js
function jaccardBigram(s1, s2) {
  const g = s => new Set(Array.from({length: Math.max(s.length - 1, 1)}, (_,i) => s.slice(i, i+2)));
  const a = g(s1), b = g(s2);
  const inter = new Set([...a].filter(x => b.has(x))).size;
  const union = new Set([...a, ...b]).size;
  return union ? inter / union : 0;
}
function isFuzzyMatchName(a, b, threshold = 0.8) {
  const na = normalizeName(a), nb = normalizeName(b);
  if (!na || !nb) return false;
  return jaccardBigram(na, nb) >= threshold;
}
```
3. フォーム集合×採用管理で、氏名が近傍一致する最良1件に紐付け（週と職種で事前に範囲を絞る）。

注意:
- GAS実行時間（6分/実行）に配慮し、対象週・対象シートに絞ること
- 類似度しきい値（例: 0.8）は運用で調整
- 完全一致優先→部分一致→近傍一致の順に判定

## 📊 データフロー**

### **1. ユーザー操作**
1. フィルタ設定（週、プラットフォーム、職種）
2. 「フィルタ適用」ボタンクリック

### **2. データ処理**
1. Next.js API経路がGASにリクエスト
2. GASがスプレッドシートからデータ取得
3. フィルタ適用と指標計算
4. 結果をJSONで返却

### **3. 表示更新**
1. フロントエンドでデータ受信
2. 既存のテーブルコンポーネントに反映
3. リアルタイムで数値更新

## 🧪 テスト手順

### **1. GAS単体テスト**
1. GASエディタで `generateFilteredReport` 関数を実行
2. パラメータ: `('8月2W', 'all', 'all')`
3. 期待値: 正しい指標が計算される

### **2. API統合テスト**
1. Next.js開発サーバー起動
2. フィルタ設定して「フィルタ適用」クリック
3. ネットワークタブでAPI呼び出し確認
4. レスポンスデータの確認

### **3. UI表示テスト**
1. 各テーブルの数値が正しく表示される
2. フィルタ変更時の数値更新
3. エラー時の適切な表示

## 🚨 トラブルシューティング

### **1. GAS実行エラー**
- スプレッドシートの列名が正しいか確認
- 日付形式が正しいか確認
- エラーログの詳細確認

### **2. API通信エラー**
- GASスクリプトIDが正しいか確認
- GASのウェブアプリ設定が正しいか確認
- CORS設定の確認

### **3. データ表示エラー**
- フィルタパラメータが正しく渡されているか確認
- データ変換処理の確認
- コンポーネントの状態管理確認

## 📈 今後の拡張性

### **1. リアルタイム更新**
- GASのトリガー機能で自動更新
- スプレッドシート変更時の即座反映

### **2. エクスポート機能**
- PDFレポート生成
- Excel/CSV出力
- メール送信

### **3. 高度な分析**
- トレンド分析
- 予測分析
- 比較分析

## ✅ 完了チェックリスト

- [ ] GASスクリプトの作成・配置
- [ ] HTMLテンプレートの作成・配置
- [ ] GASスクリプトIDの取得
- [ ] Next.js API経路の実装
- [ ] フィルタコンポーネントの統合
- [ ] データ取得ロジックの実装
- [ ] 単体テストの実行
- [ ] 統合テストの実行
- [ ] UI表示テストの実行
- [ ] エラーハンドリングの確認

## 🎉 完了後の動作確認

1. **フィルタ機能**: 週、プラットフォーム、職種の選択
2. **データ表示**: 各テーブルの正しい数値表示
3. **レスポンス**: フィルタ変更時の即座反映
4. **エラー処理**: 適切なエラーメッセージ表示
5. **パフォーマンス**: 高速なデータ取得・表示

---

**この実装により、Supabaseの複雑さを避け、シンプルで確実な採用活動ダッシュボードが完成します！**






