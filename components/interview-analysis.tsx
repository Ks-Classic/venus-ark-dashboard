"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { MessageSquare, TrendingUp, Users, Brain } from "lucide-react"
import { PeriodSelection } from "@/components/ui/period-selector"

const interviewData = [
  {
    date: "5/2",
    candidate: "動画クリエイター応募者",
    rating: "高",
    status: "5/16初回予定",
    notes: "人柄○応募意欲○現職へ退職報告中",
    category: "動画編集",
  },
  {
    date: "5/7",
    candidate: "動画クリエイター応募者",
    rating: "低",
    status: "5/31までに回答予定",
    notes: "人間性○軸なし志望度弱い",
    category: "動画編集",
  },
  {
    date: "5/8",
    candidate: "AIライター応募者",
    rating: "高",
    status: "5/16までに回答予定",
    notes: "人柄○応募意欲○現職へ退職報告中",
    category: "ライティング",
  },
  {
    date: "5/9",
    candidate: "撮影スタッフ応募者",
    rating: "中",
    status: "5/12までに回答予定",
    notes: "36歳高学歴軸なし質問回答抽象的要教育",
    category: "撮影",
  },
]

const interviewTrends = {
  totalInterviews: 12,
  highRating: 3,
  mediumRating: 4,
  lowRating: 5,
  commonConcerns: ["軸がない・志望動機が弱い", "時間制約・家庭事情", "経験不足・教育が必要", "質問回答が抽象的"],
  positiveTraits: ["人柄・人間性が良い", "応募意欲が高い", "現職への対応が適切", "学習意欲がある"],
}

interface InterviewAnalysisProps {
  dateRange: { from: Date; to: Date };
  periodSelection: PeriodSelection;
}

export function InterviewAnalysis({ dateRange, periodSelection }: InterviewAnalysisProps) {
  return (
    <div className="space-y-6">
      {/* 面談サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総面談数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviewTrends.totalInterviews}件</div>
            <p className="text-xs text-muted-foreground">今週実施</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">高評価</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviewTrends.highRating}件</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((interviewTrends.highRating / interviewTrends.totalInterviews) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">中評価</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviewTrends.mediumRating}件</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((interviewTrends.mediumRating / interviewTrends.totalInterviews) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">要改善</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviewTrends.lowRating}件</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((interviewTrends.lowRating / interviewTrends.totalInterviews) * 100)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 面談詳細リスト */}
      <Card>
        <CardHeader>
          <CardTitle>今週の面談詳細</CardTitle>
          <CardDescription>面談実施結果と評価</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {interviewData.map((interview, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{interview.date}</Badge>
                    <Badge
                      variant={
                        interview.rating === "高" ? "default" : interview.rating === "中" ? "secondary" : "destructive"
                      }
                    >
                      評価: {interview.rating}
                    </Badge>
                    <Badge variant="outline">{interview.category}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{interview.status}</span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">{interview.candidate}</h4>
                  <p className="text-sm text-muted-foreground">{interview.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 面談傾向分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              ポジティブな傾向
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {interviewTrends.positiveTraits.map((trait, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">{trait}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-yellow-500" />
              改善が必要な傾向
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {interviewTrends.commonConcerns.map((concern, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">{concern}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI分析結果 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI面談分析・推奨アクション
          </CardTitle>
          <CardDescription>面談データに基づく自動分析結果</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">📊 今週の傾向</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 高評価候補者の多くが「人柄」「応募意欲」で高評価</li>
              <li>• 低評価の主因は「軸がない」「志望動機の弱さ」</li>
              <li>• 動画クリエイター分野で質の高い応募者が増加</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">💡 推奨改善策</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• 面接前に志望動機の明確化を促すプロセス追加</li>
              <li>• 「軸がない」候補者向けのキャリア相談時間設定</li>
              <li>• 高評価候補者の早期フォローアップ強化</li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">🎯 次週の重点項目</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• 回答待ち候補者への積極的なフォローアップ</li>
              <li>• 面接質問項目の見直し（より具体的な回答を引き出す）</li>
              <li>• 教育が必要な候補者向けの研修プログラム案内</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 文字起こしデータ同期 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            面談議事録・文字起こし同期
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">面談の文字起こしデータや議事録をドラッグ&ドロップ</p>
            <Button variant="outline">ファイルを選択</Button>
          </div>

          <Textarea placeholder="面談内容のフィードバックや気づいた点を入力してください..." className="min-h-[100px]" />
          <Button>分析結果を保存</Button>
        </CardContent>
      </Card>
    </div>
  )
}
