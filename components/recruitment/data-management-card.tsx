import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

interface DataManagementCardProps {
  onSync: () => void;
  isSyncing: boolean;
  loading: boolean;
}

export function DataManagementCard({ onSync, isSyncing, loading }: DataManagementCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>データ管理</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button onClick={onSync} disabled={isSyncing || loading}>
          {isSyncing || loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          選択週のデータを同期
        </Button>
      </CardContent>
    </Card>
  );
}
