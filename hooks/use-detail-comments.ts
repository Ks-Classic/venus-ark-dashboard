import { useState, useEffect, useCallback } from 'react';
import { DetailComment } from '@/lib/types/recruitment_dashboard';

interface UseDetailCommentsProps {
  weekId: string;
  jobCategory: string;
  platform: string;
}

export function useDetailComments({ weekId, jobCategory, platform }: UseDetailCommentsProps) {
  const [comments, setComments] = useState<DetailComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // コメントの取得
  const fetchComments = useCallback(async () => {
    if (!weekId || !jobCategory || !platform) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        weekId,
        jobCategory,
        platform,
      });

      const response = await fetch(`/api/recruitment/detail-comments?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch comments';
      setError(errorMessage);
      console.error('詳細コメント取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, [weekId, jobCategory, platform]);

  // コメントの作成
  const createComment = useCallback(async (detailItemId: string, content: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/recruitment/detail-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detailItemId,
          weekId,
          jobCategory,
          platform,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const newComment = data.comment;

      setComments(prev => [...prev, newComment]);
      return newComment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create comment';
      setError(errorMessage);
      console.error('詳細コメント作成エラー:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [weekId, jobCategory, platform]);

  // コメントの更新
  const updateComment = useCallback(async (id: string, content: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/recruitment/detail-comments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const updatedComment = data.comment;

      setComments(prev => 
        prev.map(comment => 
          comment.id === id ? updatedComment : comment
        )
      );
      return updatedComment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update comment';
      setError(errorMessage);
      console.error('詳細コメント更新エラー:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // コメントの削除
  const deleteComment = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/recruitment/detail-comments?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setComments(prev => prev.filter(comment => comment.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete comment';
      setError(errorMessage);
      console.error('詳細コメント削除エラー:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 特定のdetailItemIdのコメントを取得
  const getCommentByDetailItemId = useCallback((detailItemId: string) => {
    return comments.find(comment => comment.detailItemId === detailItemId);
  }, [comments]);

  // 初期ロード
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    error,
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
    getCommentByDetailItemId,
  };
} 