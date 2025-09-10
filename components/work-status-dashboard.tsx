'use client';

import React, { useState, useEffect } from 'react';
import { DetailedStatusTable } from '@/components/work-status/detailed-status-table';
import { ContinuationRateChart } from '@/components/work-status/continuation-rate-chart';

import { WeeklyWorkStatusDetail, WeeklyWorkStatusDetailOptimized, FutureWorkersProjection, ContinuationRates } from '@/lib/types/work_status_report';
import { Loader2, RefreshCw, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WorkStatusDashboardProps {
  selectedYear: number;
  selectedMonth: number;
  selectedWeek: number;
}

// 同期結果の型定義
interface SyncResult {
  success: boolean;
  message: string;
  memberCount?: number;
  projectCount?: number;
  memberProjectStatusCount?: number;
  error?: string;
}

export function WorkStatusDashboard({ 
  selectedYear, 
  selectedMonth, 
  selectedWeek 
}: WorkStatusDashboardProps) {
  const [weeklyData, setWeeklyData] = useState<WeeklyWorkStatusDetailOptimized | null>(null);
  const [futureData, setFutureData] = useState<FutureWorkersProjection[]>([]);
  const [continuationRates, setContinuationRates] = useState<ContinuationRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // 期間が変更されたときにデータを取得
  useEffect(() => {
    const fetchWorkStatusData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 週次稼働状況データを取得
        const weeklyResponse = await fetch(
          `/api/work-status/weekly-detail?year=${selectedYear}&month=${selectedMonth}&week=${selectedWeek}`
        );
        
        if (!weeklyResponse.ok) {
          throw new Error('週次稼働状況データの取得に失敗しました');
        }
        
        const weeklyResult = await weeklyResponse.json();
        setWeeklyData(weeklyResult);

        // 将来予測データを取得
        const futureResponse = await fetch('/api/work-status/future-projection');
        
        if (!futureResponse.ok) {
          throw new Error('将来予測データの取得に失敗しました');
        }
        
        const futureResult = await futureResponse.json();
        setFutureData(futureResult);

        // 継続率データ（サンプルデータ）
        const sampleContinuationRates: ContinuationRates = {
          rate1Month: {
            targetCount: 45,
            continuedCount: 41,
            rate: 91.1,
            byCategory: {} as any
          },
          rate3Months: {
            targetCount: 38,
            continuedCount: 32,
            rate: 84.2,
            byCategory: {} as any
          },
          rate6Months: {
            targetCount: 35,
            continuedCount: 26,
            rate: 74.3,
            byCategory: {} as any
          },
          rate1Year: {
            targetCount: 28,
            continuedCount: 19,
            rate: 67.9,
            byCategory: {} as any
          }
        };
        setContinuationRates(sampleContinuationRates);

      } catch (error) {
        console.error('稼働者状況データ取得エラー:', error);
        setError(error instanceof Error ? error.message : 'データの取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkStatusData();
  }, [selectedYear, selectedMonth, selectedWeek]);

  // Notionデータ同期処理
  const handleSyncNotionData = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      const response = await fetch('/api/work-status/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setSyncResult({
          success: true,
          message: 'Notionデータの同期が完了しました',
          memberCount: result.memberCount,
          projectCount: result.projectCount,
          memberProjectStatusCount: result.memberProjectStatusCount,
        });
        
        // 同期完了後、データを再取得
        const [weeklyResponse, futureResponse] = await Promise.all([
          fetch(`/api/work-status/weekly-detail?year=${selectedYear}&month=${selectedMonth}&week=${selectedWeek}`),
          fetch('/api/work-status/future-projection')
        ]);
        
        if (weeklyResponse.ok) {
          const weeklyResult = await weeklyResponse.json();
          setWeeklyData(weeklyResult);
        }
        
        if (futureResponse.ok) {
          const futureResult = await futureResponse.json();
          setFutureData(futureResult);
        }
        
      } else {
        setSyncResult({
          success: false,
          message: 'Notionデータの同期に失敗しました',
          error: result.error || 'Unknown error',
        });
      }
    } catch (error) {
      console.error('同期処理エラー:', error);
      setSyncResult({
        success: false,
        message: 'Notionデータの同期中にエラーが発生しました',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">稼働者状況データを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">データ取得エラー</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          再読み込み
        </button>
      </div>
    );
  }

  if (!weeklyData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-yellow-800 font-medium">データが見つかりません</h3>
        <p className="text-yellow-600 mt-1">
          選択された期間（{selectedYear}年{selectedMonth}月第{selectedWeek}週）のデータがありません。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* データ管理パネル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            データ管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSyncNotionData}
              disabled={syncing}
              className="flex items-center gap-2"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {syncing ? 'Notionデータを同期中...' : 'Notionデータを同期'}
            </Button>
            
            {syncResult && (
              <Alert className={`flex-1 ${syncResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {syncResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={syncResult.success ? 'text-green-800' : 'text-red-800'}>
                    {syncResult.message}
                    {syncResult.success && syncResult.memberCount && (
                      <div className="mt-1 text-sm">
                        メンバー: {syncResult.memberCount}件、プロジェクト: {syncResult.projectCount}件、
                        メンバー別案件状況: {syncResult.memberProjectStatusCount}件を同期完了
                      </div>
                    )}
                    {!syncResult.success && syncResult.error && (
                      <div className="mt-1 text-sm">
                        エラー詳細: {syncResult.error}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>
              • このボタンをクリックすると、NotionからFirestoreに最新データを同期します<br/>
              • 同期完了後、稼働状況の数値が自動的に最新版に更新されます<br/>
              • 推奨頻度: 週1回程度
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 稼働状況詳細テーブル */}
      <DetailedStatusTable 
        weeklyData={weeklyData}
        futureProjection={futureData}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        selectedWeek={selectedWeek}
      />
      
      {/* 継続率チャート - 将来実装予定（現在は優先度低） */}
      {/* {continuationRates && (
        <ContinuationRateChart 
          continuationRates={continuationRates}
        />
      )} */}
    </div>
  );
} 