"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, AlertTriangle, MessageSquare } from "lucide-react"

const backofficeInitiatives = [
  {
    title: "VAの会社評判を更新し求職者が働きたいと思える口コミを増やす",
    status: "実施中",
    progress: 75,
    results: ["転職会議：3.03（53）→3.11（56）", "Google口コミ：3.5（11）→3.3（12）", "会社の評判：4.54（28）"],
    type: "ongoing",
  },
  {
    title: "求人応募数が伸びない課題への対応",
    status: "実施中",
    progress: 60,
    results: ["ライタータイトル変更で大幅改善（20→130件）", "SNS運用は改善なし", "本文修正を4/26実施、5月検証中"],
    type: "ongoing",
  },
  {
    title: "VAのSNSによる集客ツール作成",
    status: "実施中",
    progress: 40,
    results: ["インスタフィードをCanvaで作成中", "CTAスライド作成中", "4/2提出、川口さん確認待ち"],
    type: "ongoing",
  },
  {
    title: "稼働開始後の早期離脱・切り替えの防止",
    status: "実施中",
    progress: 80,
    results: ["初回研修資料作成完了", "2/27に2名実施済み", "コール研修スクリプト作成済み"],
    type: "ongoing",
  },
  {
    title: "新規稼働者の案件選定時間短縮",
    status: "実施中",
    progress: 90,
    results: ["AIによるフロー自動化導入", "LINE案件のNotion自動反映機能", "5/8木幡さん来社打ち合わせ実施"],
    type: "ongoing",
  },
]

interface BackOfficeDashboardProps {
  dateRange: { from: Date; to: Date }
}

export function BackOfficeDashboard({ dateRange }: BackOfficeDashboardProps) {
  const getStatusIcon = (type: string, progress: number) => {
    if (progress >= 90) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (progress >= 60) return <Clock className="h-4 w-4 text-yellow-500" />
    return <AlertTriangle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = (progress: number) => {
    if (progress >= 90) return <Badge className="bg-green-100 text-green-800">完了間近</Badge>
    if (progress >= 60) return <Badge className="bg-yellow-100 text-yellow-800">進行中</Badge>
    return <Badge className="bg-red-100 text-red-800">要注意</Badge>
  }

  return (
    <div className="space-y-6">
      {/* バックオフィス施策概要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">実施中施策</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5件</div>
            <p className="text-xs text-muted-foreground">全て進行中</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均進捗率</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">69%</div>
            <p className="text-xs text-muted-foreground">順調に進行</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">効果測定済み</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3件</div>
            <p className="text-xs text-muted-foreground">効果確認済み</p>
          </CardContent>
        </Card>
      </div>

      {/* 施策詳細リスト */}
      <Card>
        <CardHeader>
          <CardTitle>バックオフィス施策詳細</CardTitle>
          <CardDescription>実施中の施策と進捗状況</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {backofficeInitiatives.map((initiative, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(initiative.type, initiative.progress)}
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-2">{initiative.title}</h4>
                      <div className="flex items-center gap-2 mb-3">
                        {getStatusBadge(initiative.progress)}
                        <span className="text-sm text-muted-foreground">進捗: {initiative.progress}%</span>
                      </div>
                      <Progress value={initiative.progress} className="mb-3" />
                    </div>
                  </div>
                </div>

                <div className="ml-7">
                  <h5 className="font-medium text-sm mb-2">実施結果・効果</h5>
                  <ul className="space-y-1">
                    {initiative.results.map((result, resultIndex) => (
                      <li key={resultIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        {result}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 重要な成果と課題 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              主要な成果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-1">口コミ評価改善</h4>
              <p className="text-sm text-green-800">転職会議の評価が3.03→3.11に向上、口コミ投稿数も増加</p>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-1">ライター応募数大幅改善</h4>
              <p className="text-sm text-green-800">タイトル変更により20件→130件と6.5倍に増加</p>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-1">業務効率化進展</h4>
              <p className="text-sm text-green-800">AI自動化により案件選定時間の大幅短縮を実現</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              今後の課題
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-1">SNS運用改善</h4>
              <p className="text-sm text-yellow-800">タイトル変更効果なし、別のアプローチが必要</p>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-1">Instagram集客</h4>
              <p className="text-sm text-yellow-800">フィード作成中だが、運用開始まで時間要する</p>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-1">早期離脱防止</h4>
              <p className="text-sm text-yellow-800">研修制度は整備済み、効果測定と改善が必要</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* コメント機能 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            バックオフィス施策コメント
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="バックオフィス施策に関するコメントや今後の方針を入力してください..."
            className="min-h-[100px]"
          />
          <Button>コメントを保存</Button>
        </CardContent>
      </Card>
    </div>
  )
}
