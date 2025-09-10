import React from 'react';
import { Alert } from "@/components/ui/alert";

interface ErrorStateProps {
  error: string;
}

export function ErrorState({ error }: ErrorStateProps) {
  return <Alert variant="destructive">{error}</Alert>;
}
