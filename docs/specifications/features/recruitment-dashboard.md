# 採用ダッシュボード機能仕様書

## 📋 概要

採用活動の週次データを統合的に表示・管理するダッシュボード機能。
スプレッドシートからのデータ同期、週次レポート生成、コメント機能を提供。

## 🎯 主要機能

### 1. データ表示機能
- **採用活動・集客テーブル**: 週次の応募・選考状況を詳細表示
- **採用活動・採用面接テーブル**: 面接実施状況と結果を表示
- **不採用者内訳テーブル**: 不採用理由の詳細分析
- **主要項目詳細**: 重要指標の詳細説明と編集可能なコメント機能
- **職種別フィルタ**: SNS運用、動画クリエイター、AIライターなど職種別表示
- **媒体フィルタ**: Indeed、Engageなど採用媒体別フィルタリング
- **週選択機能**: 特定の週範囲を選択してテーブルデータに反映 🆕
- **テーブル幅統一**: 全てのテーブルで週列の幅を統一 🆕

### 2. データ同期機能 ✅ **実装完了**
- **スプレッドシート同期**: 手動でGoogle Sheetsからデータ取得
- **週次レポート生成**: 自動的な週次レポート作成
- **同期ステータス表示**: 同期状況とエラーハンドリング
- **データ検証**: 同期データの整合性チェック

### 3. コメント機能（主要項目詳細）🆕
- **数値クリック編集**: テーブル内の数値をクリックしてタイトル・コメント編集
- **デフォルト空状態**: 初期状態では主要項目詳細は空
- **動的項目追加**: 編集した項目が主要項目詳細に表示
- **順序変更機能**: 主要項目詳細の項目順序を変更可能
- **リアルタイム更新**: Firestoreとの同期
- **ローカル保存**: 一時的なコメント保存
- **永続化**: Firestoreへの永続保存



## 🔧 技術仕様

### フロントエンド
- **フレームワーク**: Next.js 15.2.4
- **UI コンポーネント**: Radix UI + Tailwind CSS
- **状態管理**: React Hooks (useState, useEffect, useCallback)
- **データ取得**: カスタムフック (useWeeklyReports, useRecruitmentComments)

### バックエンド
- **API Routes**: Next.js API Routes
- **データベース**: Firestore
- **外部連携**: Google Sheets API
- **認証**: Firebase Authentication

### API エンドポイント
```
POST /api/recruitment/sync              # スプレッドシート同期
POST /api/recruitment/generate-reports  # 週次レポート生成
GET  /api/recruitment/weekly-reports    # 週次レポート取得
GET  /api/recruitment/comments          # コメント取得 (主要項目詳細用)
POST /api/recruitment/comments          # コメント作成 (主要項目詳細用)
PUT  /api/recruitment/comments/:id      # コメント更新 (主要項目詳細用)
```

## 📊 データ構造

### 週次レポート (weekly_reports)
```typescript
interface WeeklyReport {
  id: string;
  weekId: string;           // "2025-W04"
  year: number;             // 2025
  weekNumber: number;       // 4
  reportType: 'recruitment';
  jobCategory: string;      // "SNS運用", "動画クリエイター", "AIライター"
  data: {
    applications: ApplicationSummary[];
    interviews: InterviewSummary[];
    rejections: RejectionSummary[];
    insights: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 採用活動・集客データ
```typescript
interface RecruitmentCollection {
  // 基本応募データ
  applications: number;           // 応募数
  applicationRejections: number;  // 応募不採用数
  applicationContinuing: number;  // 応募継続数
  
  // 書類選考データ
  documents: number;              // 書類提出数（= フォームのタイムスタンプ基準）
  documentRejections: number;     // 内不採用数
  documentContinuing: number;     // 内選考継続数（提出があれば最低でも継続に含める）
  
  // 面接関連データ
  interviewScheduled: number;     // 書類提出数
  interviewWithdrawals: number;   // 内不採用数
  interviews: number;             // 内選考継続数
  
  // 最終結果
  hires: number;                  // 採用者数
  acceptances: number;            // 内定受諾数
  rejections: number;             // 不採用者数
  withdrawals: number;            // 辞退者数
}
```

### 不採用者内訳データ
```typescript
interface RejectionBreakdown {
  experienced: number;    // 経験者
  elderly: number;        // 高齢
  unsuitable: number;     // 不適合
  foreign: number;        // 外国籍
  other: number;          // その他
}
```

### 採用活動・採用面接データ
```typescript
interface InterviewData {
  interviewScheduled: number;     // 面接予定数
  interviewImplemented: number;   // 内面接実施数
  interviewPassed: number;        // 内面接評価数
  hired: number;                  // 採用者数
  finalAcceptance: number;        // 内定受諾数
  
  // 計算値
  implementationRate: number;     // 面接実施率 (対面接予定数)
  acceptanceRate: number;         // 内定受諾率 (対採用者数)
}
```

## 🎨 UI/UX 仕様

### レイアウト
- **タブ形式**: 概要・稼働者状況・採用活動・施策の4タブ
- **レスポンシブ**: デスクトップ・タブレット・モバイル対応
- **ダークモード**: 対応予定

### 採用活動タブ
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔄 データ管理                                                   │
│ [スプレッドシートから同期] [最終同期: 2時間前]                   │
├─────────────────────────────────────────────────────────────────┤
│ 🎯 フィルタ・選択                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 職種: [SNS運用] [動画クリエイター] [AIライター] [撮影] [WEB] │ │
│ │ 媒体: [Indeed] [Engage] [その他] [全媒体]                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────
├─────────────────────────────────────────────────────────────────┤
│ 📋 採用活動：集客 (職種: SNS運用 | 媒体: Indeed)                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 2025年    │ 4月3W │ 4月4W │ 4月5W │ 5月1W │ 4週合計 │
│ │ 応募数    │   7   │   1   │  10   │   1   │   25    │
│ │ ┗応募不採用数│  2   │   0   │   2   │   0   │    4    │
│ │ ┗内選考継続数│  5   │   1   │   8   │   7   │   21    │
│ │ 書類提出数 │   0   │   0   │   4   │   2   │    6    │
│ │ ┗内不採用数 │   0   │   0   │   1   │   0   │    1    │
│ │ ┗内選考継続数│   0   │   0   │   3   │   2   │   12    │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 📋 不採用者内訳                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 経験者    │   0   │   0   │   1   │   0   │    1    │
│ │ 高齢      │   1   │   0   │   2   │   0   │    3    │
│ │ 不適合    │   1   │   0   │   0   │   0   │    1    │
│ │ 外国籍    │   0   │   0   │   0   │   0   │    0    │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 📋 採用活動：採用面接                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 面接予定数 │   1   │   0   │   1   │   1   │    3    │
│ │ ┗内面接実施数│   0   │   0   │   1   │   1   │    2    │
│ │ ┗内面接評価数│   1   │   0   │   0   │   0   │    1    │
│ │ 採用者数   │   0   │   0   │   1   │   1   │    2    │
│ │ 内定受諾数 │   0   │   0   │   0   │   1   │    1    │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 📋 実施率・受諾率                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 面接実施率 │ 0.0%  │ 0.0%  │100.0% │100.0% │ 66.7%   │
│ │ 内定受諾率 │ 0.0%  │ 0.0%  │ 0.0%  │100.0% │ 50.0%   │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 📋 主要項目詳細 (編集可能)                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ① 応募数：7件 (クリック数/414回)                [編集] 💬   │ │
│ │   • 4/5よりタイトルを戻す                                   │ │
│ │   • 4/19より面接までの口数を減らすため、エントリーフォーム内で│ │
│ │     希望日記入可能へ                                        │ │
│ │   📝 コメント: 「タイトル変更により応募数が改善...」         │ │
│ │                                                             │ │
│ │ ② 内定受諾者数：1件                               [編集] 💬 │ │
│ │   • 4/27面接 有度・低 5/14初回予定 (5月1W採用)             │ │
│ │     (クセ強 意欲△ 志望度△)                                │ │
│ │   📝 コメント: 「面接での印象と今後のフォロー計画...」       │ │
│ │                                                             │ │
│ │ WEBデザイン (クリック数/337回)                    [編集] 💬 │ │
│ │ 応募数：15件 (4/26-5/9)                                     │ │
│ │ • 書類提出：3件 面談確定1件 5/15予定                       │ │
│ │   📝 コメント: 「WEBデザイン職種の応募状況...」             │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 新しいUI要件 (2025-01-28 更新)

### 1. 週選択機能 🆕
```typescript
interface WeekSelection {
  selectedWeeks: string[];  // ['2025-W25', '2025-W26', '2025-W27', '2025-W28']
  weekRange: {
    start: string;          // '2025-W25'
    end: string;            // '2025-W28'
  };
}

// 週選択UI
const WeekSelector = () => {
  return (
    <div className="flex items-center gap-4">
      <DateRangePicker
        onWeekRangeChange={(range) => setWeekRange(range)}
        maxWeeks={4}
        defaultRange={{ start: '2025-W25', end: '2025-W28' }}
      />
      <Button onClick={applyWeekFilter}>適用</Button>
    </div>
  );
};
```

### 2. テーブル幅統一 🆕
```css
/* 全テーブル共通のカラム幅 */
.table-unified {
  table-layout: fixed;
  width: 100%;
}

.table-unified th:first-child,
.table-unified td:first-child {
  width: 200px;  /* 項目名列 */
}

.table-unified th:not(:first-child):not(:last-child),
.table-unified td:not(:first-child):not(:last-child) {
  width: 120px;  /* 週列 */
}

.table-unified th:last-child,
.table-unified td:last-child {
  width: 140px;  /* 合計列 */
}
```

### 3. 数値クリック編集機能 🆕
```typescript
interface ClickableCell {
  value: number;
  rowLabel: string;      // '応募数'
  weekId: string;        // '2025-W25'
  tableType: string;     // 'collection', 'interview', 'rejection', 'rate'
  onClick: (cellData: CellData) => void;
}

interface CellData {
  value: number;
  rowLabel: string;
  weekId: string;
  tableType: string;
  coordinates: { row: number; col: number };
}

// クリック可能セルコンポーネント
const ClickableCell = ({ value, rowLabel, weekId, tableType, onClick }: ClickableCell) => {
  const handleClick = () => {
    onClick({
      value,
      rowLabel,
      weekId,
      tableType,
      coordinates: { row: getRowIndex(), col: getColIndex() }
    });
  };

  return (
    <td 
      className="border border-gray-300 px-4 py-2 text-center cursor-pointer hover:bg-blue-50"
      onClick={handleClick}
    >
      {value}
    </td>
  );
};
```

### 4. 主要項目詳細の動的管理 🆕
```typescript
interface DetailItem {
  id: string;
  title: string;           // ユーザー入力
  comment: string;         // ユーザー入力
  sourceData: {
    value: number;
    rowLabel: string;
    weekId: string;
    tableType: string;
  };
  order: number;           // 表示順序
  createdAt: Date;
  updatedAt: Date;
}

interface DetailItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; comment: string }) => void;
  initialData?: {
    title: string;
    comment: string;
    sourceData: CellData;
  };
  loading?: boolean;
}

// 主要項目詳細の状態管理
const useDetailItems = () => {
  const [items, setItems] = useState<DetailItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addItem = async (cellData: CellData, title: string, comment: string) => {
    const newItem: DetailItem = {
      id: generateId(),
      title,
      comment,
      sourceData: cellData,
      order: items.length + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setItems(prev => [...prev, newItem]);
    await saveToFirestore(newItem);
  };

  const updateItem = async (id: string, updates: Partial<DetailItem>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates, updatedAt: new Date() } : item
    ));
    await updateInFirestore(id, updates);
  };

  const reorderItems = async (newOrder: DetailItem[]) => {
    const reorderedItems = newOrder.map((item, index) => ({
      ...item,
      order: index + 1,
      updatedAt: new Date()
    }));
    
    setItems(reorderedItems);
    await batchUpdateFirestore(reorderedItems);
  };

  return {
    items,
    isLoading,
    addItem,
    updateItem,
    reorderItems
  };
};
```

### 5. ドラッグ&ドロップ順序変更 🆕
```typescript
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const DetailItemsList = ({ items, onReorder }: { items: DetailItem[]; onReorder: (items: DetailItem[]) => void }) => {
  const handleOnDragEnd = (result: any) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, movedItem);

    onReorder(reorderedItems);
  };

  return (
    <DragDropContext onDragEnd={handleOnDragEnd}>
      <Droppable droppableId="detail-items">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="p-4 mb-2 bg-white border rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="cursor-move">⋮⋮</div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.title}</h4>
                        <p className="text-sm text-gray-600">{item.comment}</p>
                        <div className="text-xs text-gray-400 mt-1">
                          {item.sourceData.tableType} - {item.sourceData.rowLabel} - {item.sourceData.weekId}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => editItem(item)}>
                        編集
                      </Button>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
```

### 6. フィルタリング機能の拡張
```typescript
interface FilterState {
  jobCategory: string;  // 'sns' | 'video' | 'ai-writer' | 'photographer' | 'web-design' | 'all'
  platform: string;    // 'indeed' | 'engage' | 'other' | 'all'
  weekRange: {
    start: string;      // '2025-W25'
    end: string;        // '2025-W28'
  };
  selectedWeeks: string[];  // 選択された週のリスト
}

const defaultFilters: FilterState = {
  jobCategory: 'all',
  platform: 'all',
  weekRange: {
    start: '2025-W25',
    end: '2025-W28'
  },
  selectedWeeks: ['2025-W25', '2025-W26', '2025-W27', '2025-W28']
};
```

### 7. エラー修正とバグ対応 🆕
```typescript
// 値の安全性確保
const ClickableCell = ({ value, ...props }) => {
  const handleClick = () => {
    // 値が undefined または null の場合は 0 を使用
    const safeValue = value ?? 0;
    const numericValue = typeof safeValue === 'number' 
      ? safeValue 
      : parseFloat(safeValue.toString()) || 0;
    
    onClick({
      value: numericValue,
      // ...other props
    });
  };
};

// テーブルレンダリングでの正しいキー取得
{selectedWeeks.map((weekId, colIndex) => {
  const weekHeader = tableHeaders[colIndex + 1]; // +1 because first header is "2025年"
  const value = row.values[weekHeader] ?? 0;
  // ...
})}

// RegularCellでの値安全性
const RegularCell = ({ value, className = '' }) => (
  <td className={`border border-gray-300 px-4 py-2 text-center ${className}`}>
    {value ?? 0}
  </td>
);
```

## 🔄 変更履歴

### 2025-01-28 (v3.1バグ修正完了) 🆕
- **undefinedエラー修正**: ClickableCellでの値安全性確保
- **テーブルレンダリング修正**: weekKeyの生成ロジック修正
- **キー不一致解決**: tableHeadersを使用した正しいキー取得
- **値の安全性確保**: 全セルでundefined -> 0変換
- **クリック機能安定化**: 全テーブルでのクリック機能が正常動作

### 2025-01-28 (v3実装完了)
- **週選択機能実装**: 任意の週範囲を選択してテーブルデータに反映
- **テーブル幅統一**: 全テーブルで統一されたカラム幅CSS実装
- **クリック可能セル**: 数値をクリックして詳細項目編集機能
- **主要項目詳細の動的管理**: デフォルト空状態から動的に項目追加
- **順序変更機能**: 主要項目詳細の並び替え対応
- **WeekSelectorコンポーネント**: 週選択UI実装
- **ClickableCellコンポーネント**: クリック可能セル実装
- **DetailItemModalコンポーネント**: 詳細項目編集モーダル実装
- **useDetailItemsフック**: Firestore連携の詳細項目管理
- **useWeeklyReportsフック更新**: 新仕様に対応

### 2025-01-28 (前回)
- **UI仕様書更新**: 添付画像に基づいた詳細なテーブル構造定義
- **データ構造見直し**: 実際のレポート形式に合わせた型定義
- **タブ構成変更**: 5つのタブに再構成
- **主要項目詳細**: 重要指標の詳細説明機能追加
- **コメント機能追加**: 主要項目詳細の編集可能コメント機能
- **職種別タブ**: 職種ごとのデータ表示機能
- **媒体フィルタ**: Indeed、Engageなど採用媒体別フィルタリング機能

### 2025-01-28 (前回)
- **重大エラー解決**: 無限レンダリング、useState重複エラー解決
- **手動同期機能**: スプレッドシート同期UI・API実装
- **週次レポート生成**: 自動レポート生成API実装

### 2025-01-27
- **基本UI実装**: タブ構造、レスポンシブレイアウト
- **データ取得機能**: Firestoreからの週次レポート取得

## ⚙️ 実装状況 (2025-01-28 最新)

### ✅ 完了済み機能
- **基本UI実装**: 縦並びレイアウト、レスポンシブデザイン
- **データ取得**: Firestoreからの週次レポート取得
- **手動同期UI**: スプレッドシート同期ボタン
- **同期API**: `/api/recruitment/sync` エンドポイント
- **レポート生成API**: `/api/recruitment/generate-reports` エンドポイント
- **エラーハンドリング**: 統一的なエラー処理
- **媒体フィルタ**: Indeed、Engageなど採用媒体別フィルタリング
- **週選択機能**: 特定の週範囲を選択してテーブルデータに反映 ✅
- **テーブル幅統一**: 全てのテーブルで週列の幅を統一 ✅
- **数値クリック編集**: テーブル内の数値をクリックしてタイトル・コメント編集 ✅
- **主要項目詳細の動的管理**: 編集した項目が主要項目詳細に表示 ✅
- **順序変更機能**: ドラッグ&ドロップによる項目順序変更 ✅
- **詳細項目モーダル**: タイトル・コメント入力用モーダル ✅
- **コメント付きセルのハイライト**: 青色背景とメッセージアイコン表示 ✅
- **番号付き主要項目詳細**: ①②③...の番号付与 ✅
- **上下移動ボタン**: 項目順序の手動変更機能 ✅
- **エラー修正**: undefinedエラーの解決、値の安全性確保 ✅

### 🔄 実装必要項目
- **自動同期機能**: 定期的なデータ同期
- **データ検証機能**: 同期データの整合性チェック
- **パフォーマンス最適化**: 大量データ処理の最適化
- **ダークモード対応**: UI/UXの拡張

### 📋 今後の予定
- **通知機能**: 同期完了・エラー通知
- **データエクスポート**: CSV/Excel出力機能
- **レポート自動生成**: 定期的なレポート作成
- **ユーザー権限管理**: 編集権限の制御