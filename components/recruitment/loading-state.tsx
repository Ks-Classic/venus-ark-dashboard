import React from 'react';
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "レポートデータを読み込んでいます..." }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="ml-2">{message}</p>
    </div>
  );
}
