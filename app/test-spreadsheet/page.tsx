import { SpreadsheetTestPanel } from '@/components/spreadsheet-test-panel';

export default function TestSpreadsheetPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">スプレッドシート連携テスト</h1>
        <p className="text-muted-foreground mt-2">
          Google Sheetsからデータを取得して、フロントエンドでの表示を確認するためのテストページです。
        </p>
      </div>
      
      <SpreadsheetTestPanel />
    </div>
  );
} 