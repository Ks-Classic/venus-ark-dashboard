import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Loader2, Edit3, Trash2, GripVertical } from "lucide-react";
import { DetailItem } from '@/lib/types/recruitment_dashboard';

interface DetailItemsCardProps {
  items: DetailItem[];
  isLoading: boolean;
  error: string | null;
  onEdit: (item: DetailItem) => void;
  onDelete: (id: string) => void;
}

export function DetailItemsCard({ 
  items, 
  isLoading, 
  error, 
  onEdit, 
  onDelete 
}: DetailItemsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>主要項目詳細</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            読み込み中...
          </div>
        )}
        {error && <Alert variant="destructive">{error}</Alert>}
        {!isLoading && !error && (
          <ul className="space-y-4">
            {items && items.length > 0 ? (
              items.map((item) => (
                <li key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-4">
                    <GripVertical className="cursor-grab" />
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.comment}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={() => onEdit(item)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => onDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))
            ) : (
              <p className="text-muted-foreground">詳細項目はありません。</p>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
