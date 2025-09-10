import { useState, useEffect, useCallback } from 'react';
import { DetailItem, CellData } from '@/lib/types/recruitment_dashboard';
import { db } from '@/lib/firebase/client';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

export const useDetailItems = (jobCategory: string, platform: string) => {
  const [items, setItems] = useState<DetailItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Firestoreからデータを取得
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const q = query(
      collection(db, 'recruitment_detail_items'),
      where('jobCategory', '==', jobCategory),
      where('platform', '==', platform),
      orderBy('order', 'asc'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const fetchedItems: DetailItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedItems.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as DetailItem);
        });
        setItems(fetchedItems);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching detail items:', err);
        setError('データの取得に失敗しました');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobCategory, platform]);

  // 新しい項目を追加
  const addItem = useCallback(async (
    cellData: CellData, 
    title: string, 
    comment: string
  ): Promise<void> => {
    // SOWフェーズ2.2: 防御的プログラミング
    if (!cellData || typeof cellData.rowLabel === 'undefined' || typeof cellData.weekId === 'undefined') {
      const errorMsg = `Invalid cellData received. rowLabel or weekId is undefined. Aborting.`;
      console.error(errorMsg, cellData);
      setError('不正なデータのため、項目を追加できませんでした。');
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      const newItem: Omit<DetailItem, 'id'> = {
        title,
        comment,
        sourceData: {
          value: cellData.value,
          rowLabel: cellData.rowLabel,
          weekId: cellData.weekId,
          tableType: cellData.tableType
        },
        order: items.length + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        jobCategory,
        platform
      };

      await addDoc(collection(db, 'recruitment_detail_items'), newItem);
    } catch (err) {
      console.error('Error adding detail item:', err);
      setError('項目の追加に失敗しました');
      throw err; // エラーを再スローして呼び出し元に伝える
    } finally {
      setIsLoading(false);
    }
  }, [items.length, jobCategory, platform]);

  // 項目を更新
  const updateItem = useCallback(async (
    id: string, 
    updates: Partial<Pick<DetailItem, 'title' | 'comment'>>
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const docRef = doc(db, 'recruitment_detail_items', id);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      await updateDoc(docRef, updateData);
    } catch (err) {
      console.error('Error updating detail item:', err);
      setError('項目の更新に失敗しました');
      throw err; // エラーを再スローして呼び出し元に伝える
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 項目を削除
  const deleteItem = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteDoc(doc(db, 'recruitment_detail_items', id));
    } catch (err) {
      console.error('Error deleting detail item:', err);
      setError('項目の削除に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 項目の順序を変更
  const reorderItems = useCallback(async (newOrder: DetailItem[]): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const batch = writeBatch(db);
      
      newOrder.forEach((item, index) => {
        const docRef = doc(db, 'recruitment_detail_items', item.id);
        batch.update(docRef, {
          order: index + 1,
          updatedAt: new Date()
        });
      });

      await batch.commit();
    } catch (err) {
      console.error('Error reordering detail items:', err);
      setError('項目の順序変更に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 特定のセルに対応する項目を検索
  const findItemByCell = useCallback((cellData: CellData): DetailItem | undefined => {
    return items.find(item => 
      item.sourceData.rowLabel === cellData.rowLabel &&
      item.sourceData.weekId === cellData.weekId &&
      item.sourceData.tableType === cellData.tableType
    );
  }, [items]);

  return {
    items,
    isLoading,
    error,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
    findItemByCell
  };
}; 