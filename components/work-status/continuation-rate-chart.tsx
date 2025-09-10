'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ContinuationRates } from '@/lib/types/work_status_report';
import { JobCategory } from '@/lib/types/enums';

interface ContinuationRateChartProps {
  continuationRates: ContinuationRates;
  category?: JobCategory;
}

export function ContinuationRateChart({ continuationRates, category }: ContinuationRateChartProps) {
  // チャート用データの準備
  const chartData = [
    {
      period: '1ヶ月',
      rate: continuationRates.rate1Month.rate,
      target: continuationRates.rate1Month.targetCount,
      continued: continuationRates.rate1Month.continuedCount,
    },
    {
      period: '3ヶ月',
      rate: continuationRates.rate3Months.rate,
      target: continuationRates.rate3Months.targetCount,
      continued: continuationRates.rate3Months.continuedCount,
    },
    {
      period: '6ヶ月',
      rate: continuationRates.rate6Months.rate,
      target: continuationRates.rate6Months.targetCount,
      continued: continuationRates.rate6Months.continuedCount,
    },
    {
      period: '1年',
      rate: continuationRates.rate1Year.rate,
      target: continuationRates.rate1Year.targetCount,
      continued: continuationRates.rate1Year.continuedCount,
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{label}継続率</p>
          <p className="text-sm text-gray-600">
            対象者: {data.target}名
          </p>
          <p className="text-sm text-gray-600">
            継続者: {data.continued}名
          </p>
          <p className="text-sm font-medium text-blue-600">
            継続率: {data.rate.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // 継続率の評価
  const getRateStatus = (rate: number) => {
    if (rate >= 80) return { variant: 'default' as const, label: '優秀' };
    if (rate >= 60) return { variant: 'secondary' as const, label: '良好' };
    if (rate >= 40) return { variant: 'outline' as const, label: '注意' };
    return { variant: 'destructive' as const, label: '要改善' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>継続率分析</span>
          {category && (
            <Badge variant="outline">{category}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* チャート */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="rate" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 詳細数値 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {chartData.map((item) => {
              const status = getRateStatus(item.rate);
              return (
                <div key={item.period} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">
                    {item.rate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {item.period}継続率
                  </div>
                  <Badge variant={status.variant} className="text-xs">
                    {status.label}
                  </Badge>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.continued}/{item.target}名
                  </div>
                </div>
              );
            })}
          </div>

          {/* 分析コメント */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">継続率分析</h4>
            <div className="text-sm text-blue-800 space-y-1">
              {continuationRates.rate1Month.rate >= 80 && (
                <p>✅ 1ヶ月継続率が良好です（{continuationRates.rate1Month.rate.toFixed(1)}%）</p>
              )}
              {continuationRates.rate3Months.rate < 60 && (
                <p>⚠️ 3ヶ月継続率が低下しています（{continuationRates.rate3Months.rate.toFixed(1)}%）</p>
              )}
              {continuationRates.rate6Months.rate < 50 && (
                <p>🚨 6ヶ月継続率が要改善レベルです（{continuationRates.rate6Months.rate.toFixed(1)}%）</p>
              )}
              {continuationRates.rate1Year.rate >= 70 && (
                <p>🎉 1年継続率が優秀です（{continuationRates.rate1Year.rate.toFixed(1)}%）</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 