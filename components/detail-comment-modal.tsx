"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DetailItem } from "@/lib/types/recruitment_dashboard"
import { MessageSquare, Save, X } from "lucide-react"

interface DetailCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
  detailItem: DetailItem;
  initialContent?: string;
  loading?: boolean;
}

export function DetailCommentModal({
  isOpen,
  onClose,
  onSave,
  detailItem,
  initialContent = "",
  loading = false,
}: DetailCommentModalProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  // モーダルが開かれた時に初期値を設定
  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
    }
  }, [isOpen, initialContent]);

  const handleSave = async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      await onSave(content);
      onClose();
    } catch (error) {
      console.error('コメント保存エラー:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setContent(initialContent);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            コメント編集
          </DialogTitle>
          <DialogDescription>
            {detailItem.title} に関するコメントを編集してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 詳細項目の内容表示 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">項目詳細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">{detailItem.title}</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {detailItem.content.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* コメント入力エリア */}
          <div className="space-y-2">
            <label className="text-sm font-medium">コメント</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="この項目に関するコメントを入力してください..."
              className="min-h-[120px] resize-none"
              disabled={loading || isSaving}
            />
            <div className="text-xs text-gray-500">
              {content.length}/1000文字
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading || isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              disabled={!content.trim() || loading || isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 