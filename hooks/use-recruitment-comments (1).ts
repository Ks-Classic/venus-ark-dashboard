import { useState, useEffect, useCallback, useMemo } from 'react';
import { LocalComment, LocalCommentMetricKey, METRIC_DISPLAY_NAMES } from '@/lib/types/local_comment';
import { ReportComment } from '@/lib/types/report_comment';
import { useLocalComments } from './use-local-comments';
import { useFirestoreComments } from './use-firestore-comments';

interface UseRecruitmentCommentsProps {
  weekId: string;
  authorId?: string;
  authorName?: string;
}

export interface UnifiedComment {
  id: string;
  type: 'local' | 'permanent';
  weekId: string;
  metricKey: LocalCommentMetricKey;
  title: string;
  content: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  // 永続コメントの場合のみ
  authorId?: string;
  authorName?: string;
}

interface UseRecruitmentCommentsReturn {
  comments: UnifiedComment[];
  localComments: LocalComment[];
  permanentComments: ReportComment[];
  loading: boolean;
  error: string | null;
  
  // ローカルコメント操作
  addLocalComment: (params: {
    metricKey: LocalCommentMetricKey;
    title: string;
    content: string;
  }) => Promise<LocalComment>;
  
  // 永続コメント操作
  addPermanentComment: (params: {
    metricKey: LocalCommentMetricKey;
    title: string;
    content: string;
  }) => Promise<ReportComment>;
  
  // ローカル→永続への変換
  convertToPermanent: (localCommentId: string) => Promise<ReportComment>;
  
  // 統合操作
  updateComment: (id: string, type: 'local' | 'permanent', updates: {
    title?: string;
    content?: string;
  }) => Promise<void>;
  
  deleteComment: (id: string, type: 'local' | 'permanent') => Promise<void>;
  
  reorderComments: (commentIds: string[]) => Promise<void>;
  
  // ユーティリティ
  getMetricDisplayName: (metricKey: LocalCommentMetricKey) => string;
  clearAllLocalComments: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const useRecruitmentComments = ({ 
  weekId, 
  authorId = 'system', 
  authorName = 'システム' 
}: UseRecruitmentCommentsProps): UseRecruitmentCommentsReturn => {
  const [error, setError] = useState<string | null>(null);
  
  // 個別のHookを使用
  const {
    comments: localComments,
    loading: localLoading,
    error: localError,
    addComment: addLocalCommentRaw,
    updateComment: updateLocalComment,
    deleteComment: deleteLocalComment,
    reorderComments: reorderLocalComments,
    clearAllComments: clearAllLocalComments,
  } = useLocalComments({ weekId });

  const {
    comments: permanentComments,
    loading: permanentLoading,
    error: permanentError,
    addPermanentComment: addPermanentCommentRaw,
    updatePermanentComment,
    deletePermanentComment,
    reorderPermanentComments,
    refetch: refetchPermanentComments,
  } = useFirestoreComments({ weekId });

  const loading = localLoading || permanentLoading;

  // エラー統合
  useEffect(() => {
    if (localError || permanentError) {
      setError(localError || permanentError);
    } else {
      setError(null);
    }
  }, [localError, permanentError]);

  // 統合コメントリスト（ローカル + 永続）
  const comments = useMemo((): UnifiedComment[] => {
    const unified: UnifiedComment[] = [];
    
    // ローカルコメントを変換
    localComments.forEach(comment => {
      unified.push({
        id: comment.id,
        type: 'local',
        weekId: comment.weekId,
        metricKey: comment.metricKey,
        title: comment.title,
        content: comment.content,
        order: comment.order,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      });
    });

    // 永続コメントを変換
    permanentComments.forEach(comment => {
      if (comment.recruitmentMetric) {
        unified.push({
          id: comment.id!,
          type: 'permanent',
          weekId: comment.recruitmentMetric.weekId,
          metricKey: comment.recruitmentMetric.metricKey,
          title: comment.title || '',
          content: comment.comment,
          order: comment.order || 0,
          createdAt: comment.createdAt ? new Date(comment.createdAt.seconds * 1000) : new Date(),
          updatedAt: comment.updatedAt ? new Date(comment.updatedAt.seconds * 1000) : new Date(),
          authorId: comment.authorId,
          authorName: comment.authorName,
        });
      }
    });

    // order順でソート
    return unified.sort((a, b) => a.order - b.order);
  }, [localComments, permanentComments]);

  // ローカルコメント追加
  const addLocalComment = useCallback(async (params: {
    metricKey: LocalCommentMetricKey;
    title: string;
    content: string;
  }) => {
    try {
      setError(null);
      return await addLocalCommentRaw(params);
    } catch (err) {
      setError('ローカルコメントの追加に失敗しました');
      throw err;
    }
  }, [addLocalCommentRaw]);

  // 永続コメント追加
  const addPermanentComment = useCallback(async (params: {
    metricKey: LocalCommentMetricKey;
    title: string;
    content: string;
  }) => {
    try {
      setError(null);
      const metricType = params.metricKey.startsWith('reject') ? 'rejection_reason' :
                        params.metricKey.startsWith('interview') || params.metricKey.includes('hire') || params.metricKey.includes('offer') ? 'interview' :
                        'collection';
      
      return await addPermanentCommentRaw({
        metricType,
        metricKey: params.metricKey,
        title: params.title,
        content: params.content,
        authorId,
        authorName,
      });
    } catch (err) {
      setError('永続コメントの追加に失敗しました');
      throw err;
    }
  }, [addPermanentCommentRaw, authorId, authorName]);

  // ローカル→永続への変換
  const convertToPermanent = useCallback(async (localCommentId: string): Promise<ReportComment> => {
    const localComment = localComments.find(c => c.id === localCommentId);
    if (!localComment) {
      throw new Error('ローカルコメントが見つかりません');
    }

    try {
      setError(null);
      
      // 永続コメントとして追加
      const permanentComment = await addPermanentComment({
        metricKey: localComment.metricKey,
        title: localComment.title,
        content: localComment.content,
      });

      // ローカルコメントを削除
      await deleteLocalComment(localCommentId);

      return permanentComment;
    } catch (err) {
      setError('コメントの永続化に失敗しました');
      throw err;
    }
  }, [localComments, addPermanentComment, deleteLocalComment]);

  // 統合コメント更新
  const updateComment = useCallback(async (
    id: string, 
    type: 'local' | 'permanent', 
    updates: { title?: string; content?: string }
  ) => {
    try {
      setError(null);
      
      if (type === 'local') {
        await updateLocalComment(id, updates);
      } else {
        await updatePermanentComment(id, {
          title: updates.title,
          comment: updates.content,
        });
      }
    } catch (err) {
      setError('コメントの更新に失敗しました');
      throw err;
    }
  }, [updateLocalComment, updatePermanentComment]);

  // 統合コメント削除
  const deleteComment = useCallback(async (id: string, type: 'local' | 'permanent') => {
    try {
      setError(null);
      
      if (type === 'local') {
        await deleteLocalComment(id);
      } else {
        await deletePermanentComment(id);
      }
    } catch (err) {
      setError('コメントの削除に失敗しました');
      throw err;
    }
  }, [deleteLocalComment, deletePermanentComment]);

  // 統合コメント順序変更
  const reorderComments = useCallback(async (commentIds: string[]) => {
    try {
      setError(null);
      
      // ローカルと永続を分離
      const localIds = commentIds.filter(id => 
        localComments.some(c => c.id === id)
      );
      const permanentIds = commentIds.filter(id => 
        permanentComments.some(c => c.id === id)
      );

      // 並行処理で順序更新
      await Promise.all([
        localIds.length > 0 ? reorderLocalComments(localIds) : Promise.resolve(),
        permanentIds.length > 0 ? reorderPermanentComments(permanentIds) : Promise.resolve(),
      ]);
    } catch (err) {
      setError('コメント順序の変更に失敗しました');
      throw err;
    }
  }, [localComments, permanentComments, reorderLocalComments, reorderPermanentComments]);

  // メトリック表示名取得
  const getMetricDisplayName = useCallback((metricKey: LocalCommentMetricKey): string => {
    return METRIC_DISPLAY_NAMES[metricKey] || metricKey;
  }, []);

  // 再取得
  const refetch = useCallback(async () => {
    await refetchPermanentComments();
    // ローカルコメントは自動的に再読み込みされる
  }, [refetchPermanentComments]);

  return {
    comments,
    localComments,
    permanentComments,
    loading,
    error,
    addLocalComment,
    addPermanentComment,
    convertToPermanent,
    updateComment,
    deleteComment,
    reorderComments,
    getMetricDisplayName,
    clearAllLocalComments,
    refetch,
  };
}; 