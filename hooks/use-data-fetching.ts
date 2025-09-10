import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

/**
 * 汎用的なデータ取得フック
 * ローディング状態、エラー状態、データの管理を統一的に行う
 */
export function useDataFetching<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = [],
  options: {
    autoFetch?: boolean;
    errorMessage?: string;
    successMessage?: string;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    autoFetch = true,
    errorMessage = 'データの取得に失敗しました',
    successMessage
  } = options;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();
      setData(result);
      
      if (successMessage) {
        toast.success(successMessage);
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : errorMessage;
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, errorMessage, successMessage]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, dependencies);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    setData,
    setError
  };
}

/**
 * API呼び出し用の汎用フック
 */
export function useApiCall<T, P = void>(
  apiFunction: (params: P) => Promise<T>,
  options: {
    errorMessage?: string;
    successMessage?: string;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    errorMessage = 'API呼び出しに失敗しました',
    successMessage
  } = options;

  const callApi = useCallback(async (params: P): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction(params);
      
      if (successMessage) {
        toast.success(successMessage);
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : errorMessage;
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, errorMessage, successMessage]);

  return {
    callApi,
    loading,
    error,
    setError
  };
}

/**
 * フィルター状態管理フック
 */
export function useFilterState<T extends Record<string, any>>(
  initialState: T
) {
  const [filters, setFilters] = useState<T>(initialState);

  const updateFilter = useCallback(<K extends keyof T>(
    key: K,
    value: T[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<T>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialState);
  }, [initialState]);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    setFilters
  };
}

/**
 * モーダル状態管理フック
 */
export function useModalState<T = any>(initialState: {
  isOpen: boolean;
  data?: T;
} = { isOpen: false }) {
  const [modalState, setModalState] = useState(initialState);

  const openModal = useCallback((data?: T) => {
    setModalState({ isOpen: true, data });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, data: undefined });
  }, []);

  const updateModalData = useCallback((data: T) => {
    setModalState(prev => ({ ...prev, data }));
  }, []);

  return {
    isOpen: modalState.isOpen,
    data: modalState.data,
    openModal,
    closeModal,
    updateModalData
  };
}
