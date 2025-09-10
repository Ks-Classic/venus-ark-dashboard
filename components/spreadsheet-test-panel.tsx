"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SpreadsheetTestPanelProps {
  onDataFetched?: (data: any) => void;
}

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: any;
}

export function SpreadsheetTestPanel({ onDataFetched }: SpreadsheetTestPanelProps) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [range, setRange] = useState('A:I');
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-01-31');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  /**
   * テストモードでAPIを呼び出し
   */
  const handleTestMode = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/spreadsheet-test?test=true&startDate=${startDate}&endDate=${endDate}`);
      const result = await response.json();
      
      setTestResult(result);
      if (result.success && onDataFetched) {
        onDataFetched(result.data);
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 実際のスプレッドシートでテスト
   */
  const handleRealDataTest = async () => {
    if (!spreadsheetId || !sheetName) {
      setTestResult({
        success: false,
        error: 'スプレッドシートIDとシート名を入力してください',
      });
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/spreadsheet-test?startDate=${startDate}&endDate=${endDate}`);
      const result = await response.json();
      
      setTestResult(result);
      if (result.success && onDataFetched) {
        onDataFetched(result.data);
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * スプレッドシート設定のテスト
   */
  const handleConfigTest = async () => {
    if (!spreadsheetId || !sheetName) {
      setTestResult({
        success: false,
        error: 'スプレッドシートIDとシート名を入力してください',
      });
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/spreadsheet-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId,
          sheetName,
          range,
        }),
      });
      
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>スプレッドシート連携テスト</CardTitle>
          <CardDescription>
            Google Sheetsからデータを取得して、フロントエンドでの表示を確認します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="test-mode" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="test-mode">テストモード</TabsTrigger>
              <TabsTrigger value="real-data">実データテスト</TabsTrigger>
              <TabsTrigger value="config-test">設定テスト</TabsTrigger>
            </TabsList>

            <TabsContent value="test-mode" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">開始日</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">終了日</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                
                <Alert>
                  <AlertDescription>
                    テストモードでは、サンプルデータを使用してAPI連携の動作を確認します。
                    実際のスプレッドシートは使用されません。
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={handleTestMode} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'テスト実行中...' : 'テストモードで実行'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="real-data" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="spreadsheet-id">スプレッドシートID</Label>
                  <Input
                    id="spreadsheet-id"
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    GoogleスプレッドシートのURLから取得できます
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sheet-name">シート名</Label>
                    <Input
                      id="sheet-name"
                      placeholder="SNS運用"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="range">範囲</Label>
                    <Input
                      id="range"
                      placeholder="A:I"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date-real">開始日</Label>
                    <Input
                      id="start-date-real"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date-real">終了日</Label>
                    <Input
                      id="end-date-real"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    実際のスプレッドシートからデータを取得します。
                    Google Cloud Consoleでの認証設定が必要です。
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={handleRealDataTest} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? '実データ取得中...' : '実データでテスト'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="config-test" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="config-spreadsheet-id">スプレッドシートID</Label>
                  <Input
                    id="config-spreadsheet-id"
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="config-sheet-name">シート名</Label>
                    <Input
                      id="config-sheet-name"
                      placeholder="SNS運用"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="config-range">範囲</Label>
                    <Input
                      id="config-range"
                      placeholder="A:I"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                    />
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    スプレッドシートの設定が正しいかテストします。
                    データは取得せず、接続確認のみ行います。
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={handleConfigTest} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? '設定確認中...' : '設定をテスト'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* テスト結果表示 */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              テスト結果
              <Badge variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? "成功" : "失敗"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResult.success ? (
              <div className="space-y-4">
                {testResult.metadata && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>期間:</strong> {testResult.metadata.startDate} 〜 {testResult.metadata.endDate}
                    </div>
                    <div>
                      <strong>職種数:</strong> {testResult.metadata.jobCategories?.length || 0}
                    </div>
                    <div>
                      <strong>総レコード数:</strong> {testResult.metadata.totalRecords || 0}
                    </div>
                    <div>
                      <strong>生成日時:</strong> {new Date(testResult.metadata.generatedAt).toLocaleString('ja-JP')}
                    </div>
                  </div>
                )}

                {testResult.data && (
                  <div>
                    <Label>取得データ（JSON形式）</Label>
                    <Textarea
                      value={JSON.stringify(testResult.data, null, 2)}
                      readOnly
                      className="h-40 font-mono text-xs"
                    />
                  </div>
                )}

                {testResult.metadata?.jobCategories && (
                  <div>
                    <Label>職種一覧</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {testResult.metadata.jobCategories.map((category: string) => (
                        <Badge key={category} variant="outline">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  <strong>エラー:</strong> {testResult.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 使用方法ガイド */}
      <Card>
        <CardHeader>
          <CardTitle>使用方法</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold">1. テストモード</h4>
            <p className="text-sm text-muted-foreground">
              サンプルデータを使用してAPI連携の動作を確認します。
              スプレッドシートの設定は不要です。
            </p>
          </div>

          <div>
            <h4 className="font-semibold">2. 実データテスト</h4>
            <p className="text-sm text-muted-foreground">
              実際のスプレッドシートからデータを取得します。
              事前にGoogle Cloud Consoleでの認証設定が必要です。
            </p>
          </div>

          <div>
            <h4 className="font-semibold">3. 設定テスト</h4>
            <p className="text-sm text-muted-foreground">
              スプレッドシートの設定が正しいか確認します。
              データは取得せず、接続確認のみ行います。
            </p>
          </div>

          <Alert>
            <AlertDescription>
              <strong>注意:</strong> 実際のスプレッドシートを使用する場合は、
              環境変数の設定とGoogle Cloud Consoleでの認証設定が必要です。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
} 