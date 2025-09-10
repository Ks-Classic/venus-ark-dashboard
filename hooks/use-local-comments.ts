import { useState, useEffect, useCallback } from 'react';
import { LocalComment, LocalCommentCreate, LocalCommentUpdate, LOCAL_COMMENTS_KEY } from '@/lib/types/local_comment';

/**
 * ローカルストレージでのコメント管理hook
 * 高速動作とコスト最適化のため
 */
export function useLocalComments() {
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ローカルストレージからコメントを読み込み
  const loadComments = useCallback(() => {
    try {
      setLoading(true);
      const stored = localStorage.getItem(LOCAL_COMMENTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LocalComment[];
        setComments(parsed.sort((a, b) => a.order - b.order));
      } else {
        setComments([]);
      }
      setError(null);
    } catch (err) {
      console.error('ローカルコメント読み込みエラー:', err);
      setError('コメントの読み込みに失敗しました');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ローカルストレージにコメントを保存
  const saveComments = useCallback((newComments: LocalComment[]) => {
    try {
      localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(newComments));
      setComments(newComments.sort((a, b) => a.order - b.order));
      setError(null);
    } catch (err) {
      console.error('ローカルコメント保存エラー:', err);
      setError('コメントの保存に失敗しました');
    }
  }, []);

  // コメント作成
  const createComment = useCallback((commentData: LocalCommentCreate) => {
    const newComment: LocalComment = {
      ...commentData,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newComments = [...comments, newComment];
    saveComments(newComments);
    return newComment;
  }, [comments, saveComments]);

  // コメント更新
  const updateComment = useCallback((id: string, updates: LocalCommentUpdate) => {
    const newComments = comments.map(comment => 
      comment.id === id 
        ? { ...comment, ...updates, updatedAt: new Date().toISOString() }
        : comment
    );
    saveComments(newComments);
  }, [comments, saveComments]);

  // コメント削除
  const deleteComment = useCallback((id: string) => {
    const newComments = comments.filter(comment => comment.id !== id);
    saveComments(newComments);
  }, [comments, saveComments]);

  // コメント順序変更
  const reorderComments = useCallback((reorderedComments: LocalComment[]) => {
    const newComments = reorderedComments.map((comment, index) => ({
      ...comment,
      order: index,
      updatedAt: new Date().toISOString(),
    }));
    saveComments(newComments);
  }, [saveComments]);

  // 特定の週・指標のコメント取得
  const getCommentsByMetric = useCallback((weekId: string, metricType: string, metricKey: string) => {
    return comments.filter(comment => 
      comment.weekId === weekId && 
      comment.metricType === metricType && 
      comment.metricKey === metricKey
    );
  }, [comments]);

  // 初回読み込み
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  return {
    comments,
    loading,
    error,
    createComment,
    updateComment,
    deleteComment,
    reorderComments,
    getCommentsByMetric,
    reload: loadComments,
  };
} 