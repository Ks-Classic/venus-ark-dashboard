'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  Trash2, 
  GripVertical, 
  HardDrive, 
  Database,
  ArrowUp,
  RotateCcw
} from 'lucide-react';
import { UnifiedComment } from '@/lib/types/recruitment_comment';

interface KeyItemDetailsProps {
  comments: UnifiedComment[];
  onEditComment: (comment: UnifiedComment) => void;
  onDeleteComment: (id: string) => void;
  onReorderComments: (reorderedComments: UnifiedComment[]) => void;
  onConvertToPermanent: (id: string) => void;
  loading?: boolean;
}

/**
 * 主要項目詳細表示エリア
 * 番号付きリスト、アイコン区別表示、ドラッグ&ドロップ対応
 */
export function KeyItemDetails({
  comments,
  onEditComment,
  onDeleteComment,
  onReorderComments,
  onConvertToPermanent,
  loading = false,
}: KeyItemDetailsProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  // ドロップ
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newComments = [...comments];
    const draggedComment = newComments[draggedIndex];
    
    // 配列から要素を削除して新しい位置に挿入
    newComments.splice(draggedIndex, 1);
    newComments.splice(dropIndex, 0, draggedComment);

    // 順序を更新
    const reorderedComments = newComments.map((comment, index) => ({
      ...comment,
      order: index,
    }));

    onReorderComments(reorderedComments);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (comments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">主要項目詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500 text-center py-4">
            数字をクリックしてコメントを追加してください
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">主要項目詳細</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {comments.map((comment, index) => (
          <div
            key={comment.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              group relative p-3 border rounded-lg bg-white transition-all duration-200
              ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
              ${dragOverIndex === index && draggedIndex !== index ? 'border-blue-300 bg-blue-50' : ''}
              hover:shadow-sm cursor-move
            `}
          >
            {/* ドラッグハンドル */}
            <div className="absolute left-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>

            {/* 番号とアイコン */}
            <div className="flex items-start gap-3 pl-6">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <div title={comment.source === 'local' ? 'ローカル保存' : '永続保存'}>
                  {comment.source === 'local' ? (
                    <HardDrive className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Database className="w-4 h-4 text-blue-500" />
                  )}
                </div>
              </div>

              {/* コンテンツ */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm text-gray-900 truncate">
                    {comment.title}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {comment.metricKey}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {comment.content}
                </p>
                
                {/* 作成日時 */}
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(comment.createdAt).toLocaleDateString('ja-JP', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {comment.source === 'local' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onConvertToPermanent(comment.id)}
                    disabled={loading}
                    className="h-8 w-8 p-0"
                    title="永続保存に変換"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEditComment(comment)}
                  disabled={loading}
                  className="h-8 w-8 p-0"
                  title="編集"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteComment(comment.id)}
                  disabled={loading}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  title="削除"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* 統計情報 */}
        <div className="pt-2 border-t text-xs text-gray-500 flex items-center justify-between">
          <span>
            合計 {comments.length} 件
            （ローカル: {comments.filter(c => c.source === 'local').length}、
            永続: {comments.filter(c => c.source === 'firestore').length}）
          </span>
          {loading && (
            <div className="flex items-center gap-1">
              <RotateCcw className="w-3 h-3 animate-spin" />
              <span>更新中...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 