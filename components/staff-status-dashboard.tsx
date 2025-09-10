"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { MessageSquare, TrendingDown, TrendingUp } from "lucide-react"
import { PeriodSelection } from "@/components/ui/period-selector"

const staffData = [
  { week: "4月4W", total: 49, newStart: 3, ended: 0 },
  { week: "4月5W", total: 44, newStart: 0, ended: 5 },
  { week: "5月1W", total: 43, newStart: 1, ended: 2 },
  { week: "5月2W", total: 40, newStart: 0, ended: 3 },
]

const futureProjection = [
  { month: "5月", total: 60, newStart: 21, ended: 8 },
  { month: "6月", total: 61, newStart: 1, ended: 0 },
  { month: "7月", total: 55, newStart: 0, ended: 0 },
]

interface StaffStatusDashboardProps {
  dateRange: { from: Date; to: Date };
  periodSelection: PeriodSelection;
}

export function StaffStatusDashboard({ dateRange, periodSelection }: StaffStatusDashboardProps) {
  return (
    <div className="space-y-6">
      {/* 現在の稼働状況 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>稼働者数推移</CardTitle>
            <CardDescription>週次の稼働者数変動</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total: { label: "総稼働者数", color: "hsl(var(--chart-1))" },
                newStart: { label: "新規開始", color: "hsl(var(--chart-2))" },
                ended: { label: "終了", color: "hsl(var(--chart-3))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={staffData}>
                  <XAxis dataKey="week" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={3} name="総稼働者数" />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>新規開始・終了数</CardTitle>
            <CardDescription>週次の人員変動詳細</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                newStart: { label: "新規開始", color: "hsl(var(--chart-2))" },
                ended: { label: "終了", color: "hsl(var(--chart-3))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffData}>
                  <XAxis dataKey="week" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="newStart" fill="var(--color-newStart)" name="新規開始" />
                  <Bar dataKey="ended" fill="var(--color-ended)" name="終了" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* 将来見込み */}
      <Card>
        <CardHeader>
          <CardTitle>稼働者将来見込み</CardTitle>
          <CardDescription>今後3ヶ月の予測</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              total: { label: "総稼働者見込", color: "hsl(var(--chart-1))" },
            }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={futureProjection}>
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" name="総稼働者見込" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 詳細情報と課題 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              離脱・終了見込者
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <h4 className="font-semibold text-red-900 mb-2">5月終了見込（6名）</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• 齋藤みのり (5/31)</li>
                <li>• 近野皓人 (5/5)</li>
                <li>• 中澤 (5/14)</li>
                <li>• 箱崎 (5/9)</li>
                <li>• 浅井 (5/14)</li>
                <li>• 前田 (5/7)</li>
              </ul>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">要フォロー</h4>
              <p className="text-sm text-yellow-800">
                中澤花：両親から正社員になるよう言われ終了の打診あり。
                経歴上転職が難しいことを伝え、弊社で転職活動を行うとのこと。
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              新規開始予定者
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">5月開始予定（13名）</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• 園亜優奈：案件選定中</li>
                <li>• 小林陸翔：案件選定中</li>
                <li>• 太田黒嶺：日程調整中</li>
                <li>• 塩屋：日程調整中</li>
                <li>• 佐藤亘：案件合格(5/12)</li>
                <li>• 岩田麗香：稼働開始済み</li>
                <li>• その他7名</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* コメント機能 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            施策実施結果・コメント
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="稼働者状況に関する施策実施結果やコメントを入力してください..."
            className="min-h-[100px]"
          />
          <Button>コメントを保存</Button>
        </CardContent>
      </Card>
    </div>
  )
}
