'use client';

import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface MetricInfoProps {
  definition: string;
  method: string;
}

export function MetricInfo({ definition, method }: MetricInfoProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-sm p-3">
        <div className="space-y-2">
          <p className="font-medium text-sm">定義:</p>
          <p className="text-xs leading-relaxed">{definition}</p>
          <p className="font-medium text-sm">判定方法:</p>
          <p className="text-xs leading-relaxed">{method}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
