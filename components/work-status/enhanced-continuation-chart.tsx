'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ComposedChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Users,
  Target,
  AlertTriangle
} from 'lucide-react';
import { JobCategory } from '@/lib/types/enums';

// 継続率データの型定義
interface ContinuationData {
  period: string; // "2025年4月1週" など
  weekNumber: number;
  startedCount: number; // 開始人数
  continuedAfter1Week: number; // 1週間後継続
  continuedAfter2Weeks: number; // 2週間後継続
  continuedAfter1Month: number; // 1ヶ月後継続
  continuedAfter3Months: number; // 3ヶ月後継続
  continuationRate1Week: number; // 1週間継続率
  continuationRate2Weeks: number; // 2週間継続率
  continuationRate1Month: number; // 1ヶ月継続率
  continuationRate3Months: number; // 3ヶ月継続率
  riskLevel: 'low' | 'medium' | 'high'; // リスクレベル
}

interface EnhancedContinuationChartProps {
  data: ContinuationData[];
  selectedCategory?: JobCategory;
}

export function EnhancedContinuationChart({ data, selectedCategory }: EnhancedContinuationChartProps) {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [chartType, setChartType] = useState<'rate' | 'count' | 'combined'>('rate');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // データをフィルタリング
  const filteredData = selectedPeriod === 'all' 
    ? data 
    : data.filter(d => d.period.includes(selectedPeriod));

  // 継続率チャート用データ変換
  const rateChartData = filteredData.map(item => ({
    period: item.period,
    '1週間後': item.continuationRate1Week,
    '2週間後': item.continuationRate2Weeks,
    '1ヶ月後': item.continuationRate1Month,
    '3ヶ月後': item.continuationRate3Months,
  }));

  // 人数チャート用データ変換
  const countChartData = filteredData.map(item => ({
    period: item.period,
    '開始': item.startedCount,
    '1週間後': item.continuedAfter1Week,
    '2週間後': item.continuedAfter2Weeks,
    '1ヶ月後': item.continuedAfter1Month,
    '3ヶ月後': item.continuedAfter3Months,
  }));

  // 複合チャート用データ
  const combinedChartData = filteredData.map(item => ({
    period: item.period,
    startedCount: item.startedCount,
    continuationRate1Month: item.continuationRate1Month,
    riskLevel: item.riskLevel,
  }));

  // リスクレベル別の統計
  const riskStats = {
    high: filteredData.filter(d => d.riskLevel === 'high').length,
    medium: filteredData.filter(d => d.riskLevel === 'medium').length,
    low: filteredData.filter(d => d.riskLevel === 'low').length,
  };

  // 平均継続率計算
  const avgRates = {
    rate1Week: filteredData.reduce((sum, d) => sum + d.continuationRate1Week, 0) / filteredData.length,
    rate2Weeks: filteredData.reduce((sum, d) => sum + d.continuationRate2Weeks, 0) / filteredData.length,
    rate1Month: filteredData.reduce((sum, d) => sum + d.continuationRate1Month, 0) / filteredData.length,
    rate3Months: filteredData.reduce((sum, d) => sum + d.continuationRate3Months, 0) / filteredData.length,
  };

  const getRiskBadge = (riskLevel: 'low' | 'medium' | 'high') => {
    const configs = {
      low: { label: '低リスク', color: 'bg-green-100 text-green-800' },
      medium: { label: '中リスク', color: 'bg-yellow-100 text-yellow-800' },
      high: { label: '高リスク', color: 'bg-red-100 text-red-800' },
    };
    const config = configs[riskLevel];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            継続率分析（強化版）
            {selectedCategory && (
              <Badge variant="outline">{selectedCategory}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'weekly' | 'monthly')}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">週次</SelectItem>
                <SelectItem value="monthly">月次</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chartType} onValueChange={(value) => setChartType(value as 'rate' | 'count' | 'combined')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rate">継続率</SelectItem>
                <SelectItem value="count">人数</SelectItem>
                <SelectItem value="combined">複合</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">1週間継続率</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {avgRates.rate1Week.toFixed(1)}%
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">1ヶ月継続率</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {avgRates.rate1Month.toFixed(1)}%
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">3ヶ月継続率</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {avgRates.rate3Months.toFixed(1)}%
            </div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">高リスク期間</span>
            </div>
            <div className="text-2xl font-bold text-orange-900">
              {riskStats.high}件
            </div>
          </div>
        </div>

        {/* チャート表示 */}
        <div className="h-80">
          {chartType === 'rate' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rateChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                  labelFormatter={(label) => `期間: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="1週間後" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="2週間後" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="1ヶ月後" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="3ヶ月後" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {chartType === 'count' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`${value}人`, '']}
                  labelFormatter={(label) => `期間: ${label}`}
                />
                <Legend />
                <Bar dataKey="開始" fill="#8884d8" />
                <Bar dataKey="1週間後" fill="#82ca9d" />
                <Bar dataKey="1ヶ月後" fill="#ffc658" />
                <Bar dataKey="3ヶ月後" fill="#ff7300" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartType === 'combined' && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="startedCount" fill="#8884d8" name="開始人数" />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="continuationRate1Month" 
                  stroke="#ff7300" 
                  strokeWidth={3}
                  name="1ヶ月継続率(%)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 詳細データテーブル */}
        <div className="rounded-md border">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-sm">期間別継続率詳細</h3>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 border-b">期間</th>
                  <th className="text-center p-2 border-b">開始人数</th>
                  <th className="text-center p-2 border-b">1週間後</th>
                  <th className="text-center p-2 border-b">1ヶ月後</th>
                  <th className="text-center p-2 border-b">3ヶ月後</th>
                  <th className="text-center p-2 border-b">リスク</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-2 border-b font-medium">{item.period}</td>
                    <td className="p-2 border-b text-center">{item.startedCount}人</td>
                    <td className="p-2 border-b text-center">
                      <span className={item.continuationRate1Week >= 80 ? 'text-green-600 font-semibold' : 
                                     item.continuationRate1Week >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                        {item.continuationRate1Week.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2 border-b text-center">
                      <span className={item.continuationRate1Month >= 70 ? 'text-green-600 font-semibold' : 
                                     item.continuationRate1Month >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                        {item.continuationRate1Month.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2 border-b text-center">
                      <span className={item.continuationRate3Months >= 60 ? 'text-green-600 font-semibold' : 
                                     item.continuationRate3Months >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                        {item.continuationRate3Months.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2 border-b text-center">
                      {getRiskBadge(item.riskLevel)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}