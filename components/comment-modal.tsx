'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Save, Database, HardDrive } from 'lucide-react';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    content: string;
    saveType: 'temporary' | 'permanent';
  }) => void;
  initialData?: {
    title: string;
    content: string;
    isPermanent?: boolean;
  };
  metricInfo?: {
    weekId: string;
    metricType: 'collection' | 'interview' | 'rejection';
    metricKey: string;
    metricValue: number;
    metricLabel: string;
  };
  loading?: boolean;
}

/**
 * コメント編集モーダル
 * 一時保存（ローカル）と永続保存（Firestore）を選択可能
 */
export function CommentModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  metricInfo,
  loading = false,
}: CommentModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [saveType, setSaveType] = useState<'temporary' | 'permanent'>(
    initialData?.isPermanent ? 'permanent' : 'temporary'
  );

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      return;
    }

    onSave({
      title: title.trim(),
      content: content.trim(),
      saveType,
    });

    // モーダルを閉じる
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setSaveType('temporary');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>コメント編集</span>
            {metricInfo && (
              <Badge variant="outline" className="text-xs">
                {metricInfo.metricLabel}: {metricInfo.metricValue}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* タイトル入力 */}
          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 応募数増加の要因分析"
              maxLength={50}
            />
            <div className="text-xs text-gray-500 text-right">
              {title.length}/50
            </div>
          </div>

          {/* コメント内容 */}
          <div className="space-y-2">
            <Label htmlFor="content">コメント内容</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="詳細な分析や気づきを記入してください..."
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 text-right">
              {content.length}/500
            </div>
          </div>

          {/* 保存方法選択 */}
          <div className="space-y-3">
            <Label>保存方法</Label>
            <RadioGroup value={saveType} onValueChange={(value) => setSaveType(value as 'temporary' | 'permanent')}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="temporary" id="temporary" />
                <div className="flex-1">
                  <Label htmlFor="temporary" className="flex items-center gap-2 cursor-pointer">
                    <HardDrive className="w-4 h-4 text-gray-500" />
                    <span>一時保存（ローカル）</span>
                  </Label>
                  <div className="text-xs text-gray-500 mt-1">
                    高速動作・コスト0・このブラウザのみ
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="permanent" id="permanent" />
                <div className="flex-1">
                  <Label htmlFor="permanent" className="flex items-center gap-2 cursor-pointer">
                    <Database className="w-4 h-4 text-blue-500" />
                    <span>永続保存（クラウド）</span>
                  </Label>
                  <div className="text-xs text-gray-500 mt-1">
                    重要な分析・共有可能・永続保存
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!title.trim() || !content.trim() || loading}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 