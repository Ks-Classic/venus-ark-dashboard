import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JOB_CATEGORY_TABS } from '@/lib/constants/recruitment';
import { JobCategory } from '@/lib/types/consolidated';

interface FilterCardProps {
  currentFilter: JobCategory | 'all';
  onFilterChange: (filters: { jobCategory: JobCategory | 'all' }) => void;
}

export function FilterCard({ currentFilter, onFilterChange }: FilterCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>フィルタ</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {JOB_CATEGORY_TABS.map(tab => (
            <Button
              key={tab.id}
              variant={currentFilter === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange({ jobCategory: tab.id as JobCategory | 'all' })}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
