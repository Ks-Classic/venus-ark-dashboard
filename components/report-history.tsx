"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar, Download, Eye, Search, Save } from "lucide-react"
import { PeriodSelection } from "@/components/ui/period-selector"

const reportHistory = [
  {
    id: "2025-05-10",
    title: "週次MTGレポート",
    period: "4月26日～5月9日",
    date: "2025年5月10日",
    status: "保存済み",
    summary: "総稼働者数43名、新規開始2名、応募数162件",
    saved: true,
  },
  {
    id: "2025-05-03",
    title: "週次MTGレポート",
    period: "4月19日～5月2日",
    date: "2025年5月3日",
    status: "保存済み",
    summary: "総稼働者数44名、動画クリエイター応募増加、口コミ改善施策効果確認",
    saved: true,
  },
  {
    id: "2025-04-26",
    title: "週次MTGレポート",
    period: "4月12日～4月25日",
    date: "2025年4月26日",
    status: "保存済み",
    summary: "総稼働者数49名、AIライター本文修正実施、研修制度導入",
    saved: true,
  },
  {
    id: "2025-04-19",
    title: "週次MTGレポート",
    period: "4月5日～4月18日",
    date: "2025年4月19日",
    status: "保存済み",
    summary: "SNS運用タイトル変更、Instagram集客準備開始",
    saved: true,
  },
  {
    id: "current",
    title: "週次MTGレポート（作成中）",
    period: "5月10日～5月16日",
    date: "2025年5月17日",
    status: "未保存",
    summary: "現在作成中のレポート - 保存されていません",
    saved: false,
  },
]

interface ReportHistoryProps {
  periodSelection: PeriodSelection;
}

export function ReportHistory({ periodSelection }: ReportHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentReport, setCurrentReport] = useState(reportHistory.find((r) => !r.saved))

  const filteredReports = reportHistory.filter(
    (report) =>
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.summary.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSaveCurrentReport = () => {
    if (currentReport) {
      // In real implementation, save the current report
      alert("レポートが保存されました")
      setCurrentReport(undefined)
    }
  }

  return (
    <div className="space-y-6">
      {/* 現在のレポート保存 */}
      {currentReport && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Save className="h-5 w-5 text-yellow-600" />
                現在のレポート
              </span>
              <Button onClick={handleSaveCurrentReport} className="bg-yellow-600 hover:bg-yellow-700">
                <Save className="h-4 w-4 mr-2" />
                レポートを保存
              </Button>
            </CardTitle>
            <CardDescription>作成中のレポートを履歴として保存できます</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Badge variant="outline">{currentReport.period}</Badge>
                <Badge variant="destructive">未保存</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{currentReport.summary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 検索機能 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            レポート履歴
          </CardTitle>
          <CardDescription>過去の週次MTGレポートを検索・閲覧できます</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="期間、内容で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* レポート一覧 */}
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <Card key={report.id} className={!report.saved ? "border-yellow-200" : ""}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{report.title}</h3>
                    <Badge variant={report.saved ? "default" : "destructive"}>{report.status}</Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>📅 {report.period}</span>
                    <span>🗓️ {report.date}</span>
                  </div>

                  <p className="text-sm">{report.summary}</p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    閲覧
                  </Button>
                  {report.saved && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      PDF出力
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">検索条件に一致するレポートが見つかりません</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
