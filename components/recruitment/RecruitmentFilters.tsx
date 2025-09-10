'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface RecruitmentFiltersProps {
  onFiltersChange: (filters: {
    platform: string;
    jobCategory: string;
  }) => void;
}

export default function RecruitmentFilters({ onFiltersChange }: RecruitmentFiltersProps) {
  const [platform, setPlatform] = useState('all');
  const [jobCategory, setJobCategory] = useState('all');

  const platforms = [
    { value: 'all', label: 'すべて' },
    { value: 'indeed', label: 'Indeed' },
    { value: 'engage', label: 'Engage' },
  ];

  const jobCategories = [
    { value: 'all', label: 'すべて' },
    { value: '動画クリエイター', label: '動画クリエイター' },
    { value: 'AIライター', label: 'AIライター' },
    { value: '撮影スタッフ', label: '撮影スタッフ' },
    { value: 'SNS運用', label: 'SNS運用' },
    { value: 'エンジニア・デザイナー', label: 'エンジニア・デザイナー' },
    { value: 'AI人材育成/マーケ', label: 'AI人材育成/マーケ' },
  ];

  const handleFilterChange = () => {
    onFiltersChange({
      platform,
      jobCategory,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3">フィルタ設定</h3>
      
      <div className="space-y-4">
        {/* プラットフォーム選択（ボタン式） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            プラットフォーム
          </label>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => (
              <Button
                key={p.value}
                variant={platform === p.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPlatform(p.value)}
                className="min-w-[70px] h-8 text-xs"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* 職種選択（ボタン式） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            職種
          </label>
          <div className="flex flex-wrap gap-2">
            {jobCategories.map((category) => (
              <Button
                key={category.value}
                variant={jobCategory === category.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setJobCategory(category.value)}
                className="min-w-[90px] h-8 text-xs"
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>

        {/* フィルタ適用ボタン */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleFilterChange}
            size="sm"
            className="px-4 py-1 h-8 text-sm"
          >
            フィルタ適用
          </Button>
        </div>

        {/* 現在の設定表示（コンパクト） */}
        <div className="p-2 bg-gray-50 rounded text-xs text-gray-600">
          <span className="font-medium">設定:</span> {platforms.find(p => p.value === platform)?.label} | {jobCategories.find(c => c.value === jobCategory)?.label}
        </div>
      </div>
    </div>
  );
}
