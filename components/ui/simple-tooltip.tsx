'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

interface SimpleTooltipProps {
  definition: string;
  method: string;
}

export function SimpleTooltip({ definition, method }: SimpleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <Info 
        className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" 
        onClick={() => setIsVisible(!isVisible)}
      />
      {isVisible && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] max-w-[90vw] p-5 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-[80vh] overflow-y-auto">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm text-gray-800">指標の定義</h3>
              <button 
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-sm text-gray-700 mb-2">定義:</p>
                <div className="text-xs leading-relaxed text-gray-600 bg-gray-50 p-3 rounded border-l-4 border-blue-200">
                  {definition}
                </div>
              </div>
              <div>
                <p className="font-medium text-sm text-gray-700 mb-2">判定方法:</p>
                <div className="text-xs leading-relaxed text-gray-600 bg-gray-50 p-3 rounded border-l-4 border-green-200 whitespace-pre-line">
                  {method}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* オーバーレイ */}
      {isVisible && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-[9998]"
          onClick={() => setIsVisible(false)}
        />
      )}
    </div>
  );
}
