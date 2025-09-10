import { useState, useCallback } from 'react';
import { toast } from "sonner";
import { CellData, DetailItem } from '@/lib/types/recruitment_dashboard';
import { JobCategory } from '@/lib/types/enums';
import { useWeeklyReports } from './use-weekly-reports';
import { useDetailItems } from './use-detail-items';
import { errorHandler, withErrorHandling } from '@/lib/error-handling';

interface FilterState {
  jobCategory: JobCategory | 'all';
}

interface DetailModalState {
  isOpen: boolean;
  sourceData?: CellData;
  editingItem?: DetailItem | null;
}

interface UseRecruitmentDashboardProps {
  selectedYear: number;
  selectedMonth: number;
  selectedWeek: number;
}

export function useRecruitmentDashboard({
  selectedYear,
  selectedMonth,
  selectedWeek
}: UseRecruitmentDashboardProps) {
  const [filters, setFilters] = useState<FilterState>({ jobCategory: 'all' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [detailModal, setDetailModal] = useState<DetailModalState>({ 
    isOpen: false, 
    editingItem: null 
  });

  // SWRに置き換えたフックを呼び出す
  const { weeklyData, loading, error, mutate } = useWeeklyReports({
    selectedYear,
    selectedMonth,
    selectedWeek,
    jobCategory: filters.jobCategory,
  });

  const { 
    items: detailItems, 
    isLoading: detailItemsLoading, 
    error: detailItemsError, 
    addItem, 
    updateItem, 
    deleteItem, 
    findItemByCell 
  } = useDetailItems(filters.jobCategory, 'all');

  const handleWeekSync = useCallback(async () => {
    setIsSyncing(true);
    const syncTime = `${selectedYear}年${selectedMonth}月${selectedWeek}週`;
    console.log('[SYNC] Starting week sync', { year: selectedYear, month: selectedMonth, weekInMonth: selectedWeek });
    toast.info(`選択週 (${syncTime}) の同期を開始しました...`);
    
    const result = await withErrorHandling(async () => {
      const weekSelector = `${selectedMonth}月${selectedWeek}W`;
      const params = new URLSearchParams({
        weekSelector: weekSelector,
        platform: 'all', // Sync all platforms
        jobCategory: filters.jobCategory === 'all' ? 'all' : filters.jobCategory, // Sync for selected job category
        year: String(selectedYear),
        month: String(selectedMonth),
        weekInMonth: String(selectedWeek),
      });
      
      const response = await fetch(`/api/recruitment/gas-weekly-reports?${params.toString()}`, {
        method: 'GET', // GAS APIはGETメソッドを使用
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      const traceId = response.headers.get('X-Trace-Id') || data?.traceId;
      console.log('[SYNC] API response from /api/recruitment/gas-weekly-reports', { ok: response.ok, status: response.status, traceId });

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: 選択週の同期に失敗しました。`);
      }

      // GAS APIはsuccessフィールドを返さない可能性があるため、dataの存在で判定
      if (data.error) {
        throw new Error(data.error || '選択週の同期に失敗しました。');
      }

      return data;
    });

      if (result) {
        console.log('[SYNC] Week sync succeeded. Revalidating weekly reports via SWR mutate()');
        toast.success(`選択週 (${syncTime}) の同期が完了しました。Trace: ${result.traceId || 'n/a'}`);
      // データを再取得
      mutate();
    } else {
      console.error('[SYNC] Week sync failed (result is falsy). See previous error toast/logs for details.');
      toast.error(`選択週の同期に失敗しました。`);
    }
    
    console.log('[SYNC] Week sync flow finished');
    setIsSyncing(false);
  }, [selectedYear, selectedMonth, selectedWeek, filters.jobCategory, mutate]);

  const handleCellClick = useCallback((cellData: CellData) => {
    setDetailModal({
      isOpen: true,
      sourceData: cellData,
      editingItem: null
    });
  }, []);

  const handleEditDetailItem = useCallback((item: DetailItem) => {
    setDetailModal({
      isOpen: true,
      sourceData: item.sourceData,
      editingItem: item
    });
  }, []);

  const handleDetailItemSave = useCallback(async (payload: { title: string; comment: string }) => {
    try {
      // 防御: ソースデータが無ければ保存不可
      if (!detailModal.sourceData) {
        toast.error('保存できません。選択されたセル情報が見つかりません。');
        throw new Error('Missing sourceData for detail item');
      }

      if (detailModal.editingItem) {
        // 既存アイテムの更新
        await updateItem(detailModal.editingItem.id, { title: payload.title, comment: payload.comment });
        toast.success('詳細項目を更新しました。');
      } else {
        // 新規アイテムの追加（cellData を必ず付与）
        await addItem(detailModal.sourceData, payload.title, payload.comment);
        toast.success('詳細項目を追加しました。');
      }
      
      setDetailModal({ isOpen: false, editingItem: null });
    } catch (error) {
      errorHandler(error, '詳細項目の保存に失敗しました。');
    }
  }, [detailModal.editingItem, detailModal.sourceData, addItem, updateItem]);

  const handleCloseModal = useCallback(() => {
    setDetailModal({ isOpen: false, editingItem: null });
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return {
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
  };
}
