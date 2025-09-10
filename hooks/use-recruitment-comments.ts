import { useState, useEffect, useCallback } from 'react';
import { useLocalComments } from './use-local-comments';
import { useFirestoreComments } from './use-firestore-comments';
import { UnifiedComment } from '@/lib/types/recruitment_comment';
import { LocalComment } from '@/lib/types/local_comment';

/**
 * 統合コメント管理hook
 * ローカルストレージとFirestoreを統一的に管理
 * 3層アーキテクチャの最上位レイヤー
 * 
 * 遅延初期化：実際にコメント機能を使用する時のみFirestoreにアクセス
 */
export function useRecruitmentComments() {
  const localComments = useLocalComments();
  const firestoreComments = useFirestoreComments();
  
  const [unifiedComments, setUnifiedComments] = useState<UnifiedComment[]>([]);
  const [loading, setLoading] = useState(false); // 初期状態はfalseに変更
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false); // 初期化フラグ追加

  // 初回データ読み込み関数（遅延初期化）
  const initializeComments = useCallback(async (weekId?: string) => {
    if (isInitialized) return; // 既に初期化済みの場合はスキップ
    
    try {
      setLoading(true);
      setError(null);

      // Firestoreからコメント取得
      const firestoreData = await firestoreComments.getComments(weekId);
      
      // ローカルコメントを統合形式に変換
      const localData: UnifiedComment[] = localComments.comments.map(comment => ({
        ...comment,
        isPermanent: false,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        source: 'local' as const,
      }));

      // Firestoreコメントを統合形式に変換
      const firestoreData_unified: UnifiedComment[] = firestoreData.map(comment => ({
        ...comment,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        source: 'firestore' as const,
      }));

      // 統合してソート
      const merged = [...localData, ...firestoreData_unified]
        .sort((a, b) => a.order - b.order);

      setUnifiedComments(merged);
      setIsInitialized(true); // 初期化完了フラグ
    } catch (err) {
      console.error('コメント統合エラー:', err);
      setError('コメントの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [firestoreComments.getComments, localComments.comments, isInitialized]);

  // 手動でデータを読み込む関数
  const reloadComments = useCallback(async (weekId?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Firestoreからコメント取得
      const firestoreData = await firestoreComments.getComments(weekId);
      
      // ローカルコメントを統合形式に変換
      const localData: UnifiedComment[] = localComments.comments.map(comment => ({
        ...comment,
        isPermanent: false,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        source: 'local' as const,
      }));

      // Firestoreコメントを統合形式に変換
      const firestoreData_unified: UnifiedComment[] = firestoreData.map(comment => ({
        ...comment,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        source: 'firestore' as const,
      }));

      // 統合してソート
      const merged = [...localData, ...firestoreData_unified]
        .sort((a, b) => a.order - b.order);

      setUnifiedComments(merged);
      setIsInitialized(true);
    } catch (err) {
      console.error('コメント統合エラー:', err);
      setError('コメントの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [firestoreComments.getComments, localComments.comments]);

  // 一時保存（ローカルストレージ）
  const saveTemporary = useCallback(async (data: {
    weekId: string;
    metricType: 'collection' | 'interview' | 'rejection';
    metricKey: string;
    title: string;
    content: string;
  }) => {
    // コメント機能初回使用時に初期化
    if (!isInitialized) {
      await initializeComments();
    }
    
    let maxOrder = 0;
    setUnifiedComments(prev => {
      maxOrder = Math.max(0, ...prev.map(c => c.order));
      return prev;
    });
    
    const comment = localComments.createComment({
      ...data,
      order: maxOrder + 1,
    });
    
    // 統合リストを手動で更新（mergeComments呼び出しを避ける）
    const newUnifiedComment: UnifiedComment = {
      ...comment,
      isPermanent: false,
      source: 'local' as const,
    };
    setUnifiedComments(prev => [...prev, newUnifiedComment].sort((a, b) => a.order - b.order));
    
    return comment;
  }, [localComments, initializeComments, isInitialized]);

  // 永続保存（Firestore）
  const savePermanent = useCallback(async (data: {
    weekId: string;
    metricType: 'collection' | 'interview' | 'rejection';
    metricKey: string;
    title: string;
    content: string;
  }) => {
    // コメント機能初回使用時に初期化
    if (!isInitialized) {
      await initializeComments();
    }
    
    let maxOrder = 0;
    setUnifiedComments(prev => {
      maxOrder = Math.max(0, ...prev.map(c => c.order));
      return prev;
    });
    
    const comment = await firestoreComments.createComment({
      ...data,
      order: maxOrder + 1,
      isPermanent: true,
    });
    
    if (comment) {
      // 統合リストを手動で更新
      const newUnifiedComment: UnifiedComment = {
        ...comment,
        source: 'firestore' as const,
      };
      setUnifiedComments(prev => [...prev, newUnifiedComment].sort((a, b) => a.order - b.order));
    }
    
    return comment;
  }, [firestoreComments, initializeComments, isInitialized]);

  // ローカル→永続への変換
  const convertToPermanent = useCallback(async (localId: string): Promise<boolean> => {
    // コメント機能初回使用時に初期化
    if (!isInitialized) {
      await initializeComments();
    }
    
    const localComment = localComments.comments.find(c => c.id === localId);
    if (!localComment) {
      setError('変換対象のコメントが見つかりません');
      return false;
    }

    // Firestoreに保存
    const firestoreComment = await firestoreComments.createComment({
      weekId: localComment.weekId,
      metricType: localComment.metricType,
      metricKey: localComment.metricKey,
      title: localComment.title,
      content: localComment.content,
      order: localComment.order,
      isPermanent: true,
    });

    if (firestoreComment) {
      // ローカルから削除
      localComments.deleteComment(localId);
      // 統合リストを手動で更新
      setUnifiedComments(prev => {
        const filtered = prev.filter(c => c.id !== localId);
        const newUnifiedComment: UnifiedComment = {
          ...firestoreComment,
          source: 'firestore' as const,
        };
        return [...filtered, newUnifiedComment].sort((a, b) => a.order - b.order);
      });
      return true;
    }

    return false;
  }, [localComments, firestoreComments, initializeComments, isInitialized]);

  // コメント更新
  const updateComment = useCallback(async (id: string, updates: {
    title?: string;
    content?: string;
    order?: number;
  }): Promise<boolean> => {
    // コメント機能初回使用時に初期化
    if (!isInitialized) {
      await initializeComments();
    }
    
    let comment: UnifiedComment | undefined;
    setUnifiedComments(prev => {
      comment = prev.find(c => c.id === id);
      return prev;
    });
    if (!comment) {
      setError('更新対象のコメントが見つかりません');
      return false;
    }

    if (comment.source === 'local') {
      localComments.updateComment(id, updates);
      // 統合リストを手動で更新
      setUnifiedComments(prev => prev.map(c => 
        c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
      ).sort((a, b) => a.order - b.order));
      return true;
    } else {
      const success = await firestoreComments.updateComment(id, updates);
      if (success) {
        // 統合リストを手動で更新
        setUnifiedComments(prev => prev.map(c => 
          c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
        ).sort((a, b) => a.order - b.order));
      }
      return success;
    }
  }, [localComments, firestoreComments, initializeComments, isInitialized]);

  // コメント削除
  const deleteComment = useCallback(async (id: string): Promise<boolean> => {
    // コメント機能初回使用時に初期化
    if (!isInitialized) {
      await initializeComments();
    }
    
    let comment: UnifiedComment | undefined;
    setUnifiedComments(prev => {
      comment = prev.find(c => c.id === id);
      return prev;
    });
    if (!comment) {
      setError('削除対象のコメントが見つかりません');
      return false;
    }

    if (comment.source === 'local') {
      localComments.deleteComment(id);
      // 統合リストを手動で更新
      setUnifiedComments(prev => prev.filter(c => c.id !== id));
      return true;
    } else {
      const success = await firestoreComments.deleteComment(id);
      if (success) {
        // 統合リストを手動で更新
        setUnifiedComments(prev => prev.filter(c => c.id !== id));
      }
      return success;
    }
  }, [localComments, firestoreComments, initializeComments, isInitialized]);

  // 特定の週・指標のコメント取得
  const getCommentsByMetric = useCallback(async (weekId: string, metricType: string, metricKey: string) => {
    // コメント機能初回使用時に初期化
    if (!isInitialized) {
      await initializeComments(weekId);
    }
    
    return unifiedComments.filter(comment => 
      comment.weekId === weekId && 
      comment.metricType === metricType && 
      comment.metricKey === metricKey
    );
  }, [unifiedComments, initializeComments, isInitialized]);

  return {
    comments: unifiedComments,
    loading: loading || localComments.loading,
    error: error || localComments.error,
    isInitialized, // 初期化状態を公開
    saveTemporary,
    savePermanent,
    convertToPermanent,
    updateComment,
    deleteComment,
    getCommentsByMetric,
    reload: reloadComments,
    initialize: initializeComments, // 手動初期化関数を公開
  };
} 