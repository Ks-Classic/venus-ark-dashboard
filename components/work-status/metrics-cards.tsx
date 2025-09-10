'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, UserPlus, UserMinus, ArrowUpDown } from 'lucide-react';
import { WorkStatusSummary } from '@/lib/types/work_status_report';

interface WorkStatusMetricsCardsProps {
  summary: WorkStatusSummary;
}

export function WorkStatusMetricsCards({ summary }: WorkStatusMetricsCardsProps) {
  const metrics = [
    {
      title: '月初稼働人数',
      value: summary.activeMembers,
      icon: Users,
      description: '前月末時点の稼働者数',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '新規稼働',
      value: summary.newWorkCount,
      icon: UserPlus,
      description: '今月新たに稼働開始',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '切り替え',
      value: summary.switchingCount,
      icon: ArrowUpDown,
      description: '案件切り替え',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: '案件解除',
      value: summary.projectReleaseCount,
      icon: UserMinus,
      description: '案件終了による解除',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: '契約解除',
      value: summary.contractTerminationCount,
      icon: UserMinus,
      description: '契約終了による解除',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
    },
    {
      title: '月末稼働人数',
      value: summary.currentActiveMembers,
      icon: Users,
      description: '現在の稼働者数',
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <div className={`p-2 rounded-full ${metric.bgColor}`}>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}名</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        );
      })}

      {/* 成長率・離職率カード */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm font-medium">月次変動率</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {summary.netChange >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 mr-1" />
                )}
                <span className="text-lg font-bold">
                  {summary.netChange >= 0 ? '+' : ''}{summary.netChange}名
                </span>
              </div>
              <p className="text-xs text-muted-foreground">純増減</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Badge 
                  variant={summary.growthRate >= 0 ? "default" : "destructive"}
                  className="text-sm"
                >
                  {summary.growthRate >= 0 ? '+' : ''}{summary.growthRate.toFixed(1)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">成長率</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Badge 
                  variant={summary.turnoverRate <= 5 ? "default" : summary.turnoverRate <= 10 ? "secondary" : "destructive"}
                  className="text-sm"
                >
                  {summary.turnoverRate.toFixed(1)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">離職率</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 