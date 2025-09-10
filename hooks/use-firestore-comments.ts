import { useState, useCallback } from 'react';
import { RecruitmentComment, RecruitmentCommentCreate, RecruitmentCommentUpdate } from '@/lib/types/recruitment_comment';

/**
 * Firestore永続保存用コメント管理hook
 * 重要な分析結果や共有が必要なコメント用
 * 
 * Note: クライアントサイドでFirebase Client SDKを使用
 * API経由でFirestoreにアクセスします
 */
export function useFirestoreComments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // コメント取得
  const getComments = useCallback(async (weekId?: string): Promise<RecruitmentComment[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const url = weekId 
        ? `/api/recruitment/comments?weekId=${encodeURIComponent(weekId)}`
        : '/api/recruitment/comments';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`コメント取得失敗: ${response.status}`);
      }
      
      const data = await response.json();
      return data.comments || [];
    } catch (err) {
      console.error('Firestoreコメント取得エラー:', err);
      setError(err instanceof Error ? err.message : 'コメントの取得に失敗しました');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // コメント作成
  const createComment = useCallback(async (commentData: RecruitmentCommentCreate): Promise<RecruitmentComment | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/recruitment/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData),
      });
      
      if (!response.ok) {
        throw new Error(`コメント作成失敗: ${response.status}`);
      }
      
      const data = await response.json();
      return data.comment;
    } catch (err) {
      console.error('Firestoreコメント作成エラー:', err);
      setError(err instanceof Error ? err.message : 'コメントの作成に失敗しました');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // コメント更新
  const updateComment = useCallback(async (id: string, updates: RecruitmentCommentUpdate): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/recruitment/comments?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`コメント更新失敗: ${response.status}`);
      }
      
      return true;
    } catch (err) {
      console.error('Firestoreコメント更新エラー:', err);
      setError(err instanceof Error ? err.message : 'コメントの更新に失敗しました');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // コメント削除
  const deleteComment = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/recruitment/comments?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`コメント削除失敗: ${response.status}`);
      }
      
      return true;
    } catch (err) {
      console.error('Firestoreコメント削除エラー:', err);
      setError(err instanceof Error ? err.message : 'コメントの削除に失敗しました');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getComments,
    createComment,
    updateComment,
    deleteComment,
  };
} 