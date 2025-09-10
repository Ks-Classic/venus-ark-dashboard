import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { CellData } from '@/lib/types/recruitment_dashboard';

interface DetailItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; comment: string }) => void;
  initialData?: {
    title: string;
    comment: string;
  };
  sourceData?: CellData;
  loading?: boolean;
}

export const DetailItemModal: React.FC<DetailItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  sourceData,
  loading = false
}) => {
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (sourceData) {
        // 編集モードの場合
        if (initialData) {
          setTitle(initialData.title);
          setComment(initialData.comment);
        } 
        // 新規作成モードの場合
        else {
          setTitle(`${sourceData.rowLabel}：${sourceData.value}件 (${sourceData.weekId})`);
          setComment('');
        }
      } else {
        // sourceDataがない場合は、安全のためにすべてクリア
        setTitle('');
        setComment('');
      }
    }
  }, [isOpen, initialData, sourceData]);

  const handleSave = () => {
    if (title.trim()) {
      onSave({ title: title.trim(), comment: comment.trim() });
    }
  };

  const handleClose = () => {
    setTitle('');
    setComment('');
    onClose();
  };

  const isValid = !!title.trim();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? '主要項目詳細を編集' : '主要項目詳細を追加'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {sourceData && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <div><strong>テーブル:</strong> {getTableTypeName(sourceData.tableType)}</div>
                <div><strong>項目:</strong> {sourceData.rowLabel}</div>
                <div><strong>週:</strong> {sourceData.weekId}</div>
                <div><strong>値:</strong> {sourceData.value}</div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: ① 応募数：7件 (クリック数/414回)"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">コメント</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="詳細なコメントを入力してください..."
              className="w-full min-h-[100px]"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!isValid || loading}
            className="flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {initialData ? '更新' : '追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function getTableTypeName(tableType: string): string {
  switch (tableType) {
    case 'collection':
      return '採用・集客';
    case 'interview':
      return '採用面接';
    case 'rejection':
      return '不採用者内訳';
    case 'rate':
      return '実施率・受諾率';
    default:
      return tableType;
  }
}