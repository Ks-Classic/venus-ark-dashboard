'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Edit3, Trash2, GripVertical, Bug } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { DetailItemModal } from '@/components/detail-item-modal';
import { RecruitmentCollectionTable } from './recruitment-collection-table';
import { RecruitmentInterviewTable } from './recruitment-interview-table';
import { RejectionReasonTable } from './rejection-reason-table';
import { useRecruitmentDashboard } from '@/hooks/use-recruitment-dashboard';
import { JOB_CATEGORY_TABS } from '@/lib/constants/recruitment';
import { JobCategory } from '@/lib/types/consolidated';

interface RecruitmentDashboardProps {
  selectedYear: number;
  selectedMonth: number;
  selectedWeek: number;
}

export default function RecruitmentDashboard({ 
  selectedYear, 
  selectedMonth, 
  selectedWeek 
}: RecruitmentDashboardProps) {
  const {
    filters,
    isSyncing,
    detailModal,
    weeklyData,
    detailItems,
    loading,
    detailItemsLoading,
    error,
    detailItemsError,
    handleWeekSync,
    handleCellClick,
    handleEditDetailItem,
    handleDetailItemSave,
    handleCloseModal,
    handleFilterChange,
    deleteItem,
  } = useRecruitmentDashboard({
    selectedYear,
    selectedMonth,
    selectedWeek
  });

  const [showDebug, setShowDebug] = useState(false);

  // 未表示項目の検出（RECRUITMENT_DEBUG）
  if (process.env.NEXT_PUBLIC_RECRUITMENT_DEBUG === 'true' && weeklyData && weeklyData.length > 0) {
    const missing: Record<string, string[]> = {};
    weeklyData.forEach((r: any) => {
      const m = r?.recruitmentMetrics || {};
      const fields = ['applyCount','documentSubmitted','interviewScheduled','interviewConducted','hireCount','offerAcceptedCount','applyRejectCount','documentRejectCount','interviewCancelled'];
      const none = fields.filter(f => m[f] === undefined || m[f] === null);
      if (none.length > 0) missing[r.id] = none;
    });
    if (Object.keys(missing).length > 0) {
      // eslint-disable-next-line no-console
      console.warn('[UI-CHECK] missing metrics fields detected', missing);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>データ管理</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              onClick={handleWeekSync} 
              disabled={isSyncing || loading}
              className="flex-1"
            >
              {isSyncing || loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              選択週のデータを同期
            </Button>
            <Button variant={showDebug ? 'default' : 'outline'} onClick={() => setShowDebug(v => !v)}>
              <Bug className="mr-2 h-4 w-4" />
              Raw JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>フィルタ</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {JOB_CATEGORY_TABS.map(tab => (
              <Button
                key={tab.id}
                variant={filters.jobCategory === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange({ jobCategory: tab.id as JobCategory | 'all' })}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2">レポートデータを読み込んでいます...</p>
        </div>
      )}
      {error && <Alert variant="destructive">{error}</Alert>}

      {!loading && !error && weeklyData && weeklyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecruitmentCollectionTable 
            reports={weeklyData} 
            onNumberClick={handleCellClick}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedWeek={selectedWeek}
          />
          <RecruitmentInterviewTable 
            reports={weeklyData} 
            onNumberClick={handleCellClick} 
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedWeek={selectedWeek}
          />
          <RejectionReasonTable 
            reports={weeklyData} 
            onNumberClick={handleCellClick} 
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedWeek={selectedWeek}
          />
        </div>
      )}
      
      {!loading && !error && (!weeklyData || weeklyData.length === 0) && (
        <p className="text-center py-4 text-muted-foreground">選択された期間のレポートデータが見つかりません。</p>
      )}

      {showDebug && (
        <Card>
          <CardHeader><CardTitle>Raw weeklyData</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap break-all bg-muted p-3 rounded">
{JSON.stringify(weeklyData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>主要項目詳細</CardTitle></CardHeader>
        <CardContent>
          {detailItemsLoading && <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />読み込み中...</div>}
          {detailItemsError && <Alert variant="destructive">{detailItemsError}</Alert>}
          {!detailItemsLoading && !detailItemsError && (
            <ul className="space-y-4">
              {detailItems && detailItems.length > 0 ? (
                detailItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-4">
                      <GripVertical className="cursor-grab" />
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.comment}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="icon" onClick={() => handleEditDetailItem(item)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))
              ) : (
                <p className="text-muted-foreground">詳細項目はありません。</p>
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      <DetailItemModal
        isOpen={detailModal.isOpen}
        onClose={handleCloseModal}
        onSave={handleDetailItemSave}
        initialData={detailModal.editingItem ?? undefined}
        sourceData={detailModal.sourceData}
      />
    </div>
  );
}