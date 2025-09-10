"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Settings, CheckCircle, Clock, AlertCircle, Save, X, User, Calendar, Filter, MoreVertical, History, GitBranch } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PeriodSelection } from "@/components/ui/period-selector"
import { cn } from "@/lib/cn"
import { 
  InitiativeDetail, 
  InitiativeStatus, 
  InitiativeCategory, 
  Priority, 
  CreateInitiativeData, 
  UpdateInitiativeData 
} from "@/lib/types/initiative"

// レガシー型定義（段階的移行のため一時的に保持）
interface LegacyInitiative {
  id: string
  status: InitiativeStatus
  issue: string
  cause: string
  action: string
  result: string
  createdAt: string
  updatedAt: string
  dueDate?: string
  priority: "高" | "中" | "低"
  assignee?: string
  title?: string
  category?: InitiativeCategory
}

// インライン編集の状態
interface EditingState {
  initiativeId: string | null
  field: string | null
  value: string
}

interface InitiativesDashboardProps {
  dateRange: { from: Date; to: Date }
  periodSelection: PeriodSelection
}

export function InitiativesDashboard({ dateRange, periodSelection }: InitiativesDashboardProps) {
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  
  // インライン編集状態
  const [editing, setEditing] = useState<EditingState>({
    initiativeId: null,
    field: null,
    value: ""
  })

  // フォーム状態
  const [formData, setFormData] = useState({
    status: InitiativeStatus.PLANNED,
    issue: "",
    cause: "",
    action: "",
    result: "",
    priority: "中" as "高" | "中" | "低",
    assignee: "",
    dueDate: ""
  })

  // 初期データ（サンプルデータ）
  useEffect(() => {
    const sampleInitiatives: Initiative[] = [
      {
        id: "1",
        status: InitiativeStatus.IN_PROGRESS,
        issue: "VAの会社評判を更新し求職者が働きたいと思える口コミを増やす",
        cause: "VADコミ評価が低いため",
        action: "「口コミ」を投稿",
        result: "6/7時点\n・「転職会議」3.09（56）\n（★1：10件/★2：5件/★3：7件/★4：20件/★5：8件）\n・「Googleロコミ」3.3（12）\n（★1：5件/★4：1件/★5：5件）\n・「会社の評判」　（ホワイトハウス）4.54（26）\n（★1：0件/★2：2件/★3：1件/★4：9件/★5：14件）5人の投稿",
        createdAt: "2024-06-01",
        updatedAt: "2024-06-07",
        priority: "高",
        assignee: "採用担当",
        dueDate: "2024-07-31"
      },
      {
        id: "2",
        status: InitiativeStatus.IN_PROGRESS,
        issue: "新規メンバーの接触開始が1ヶ月以上遅れている",
        cause: "現場との間に社内での条件が多いため、面接日程のやり取り等の連携に時間がかかる",
        action: "6/6プロジェクト株式会社とMTG\nReLコールセンターとのMTG",
        result: "2名応募中、条件共有を開始\n1名応募中、実施完了を開始",
        createdAt: "2024-06-01",
        updatedAt: "2024-06-06",
        priority: "高",
        assignee: "プロジェクト管理",
        dueDate: "2024-06-30"
      },
      {
        id: "3",
        status: InitiativeStatus.IN_PROGRESS,
        issue: "面接数が少ない",
        cause: "エントリーから面接日決定まで日数がかかっている",
        action: "エントリーフォームの回答ページを改良（応募者に面接候補日を入力してもらう）→面接日が選びやすくならないよう改善日を提案",
        result: "今週から実施していたため、来週も効果を見て報告予定",
        createdAt: "2024-06-01",
        updatedAt: "2024-06-07",
        priority: "中",
        assignee: "採用担当",
        dueDate: "2024-06-15"
      },
      {
        id: "4",
        status: InitiativeStatus.COMPLETED,
        issue: "求人ごとに必要なデータが揃えない",
        cause: "6/1より有料採用の分析フォームへ変更されたため",
        action: "5/31 メールにて問い合わせ\n6/6 MTG実施",
        result: "解決しており現在確認中",
        createdAt: "2024-06-01",
        updatedAt: "2024-06-06",
        priority: "中",
        assignee: "データ分析",
        dueDate: "2024-06-10"
      }
    ]
    setInitiatives(sampleInitiatives)
  }, [])

  // 施策のフィルタリング
  const filteredInitiatives = initiatives.filter(initiative => {
    const statusMatch = filterStatus === "all" || initiative.status === filterStatus
    const priorityMatch = filterPriority === "all" || initiative.priority === filterPriority
    const searchMatch = searchQuery === "" || 
      initiative.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      initiative.cause.toLowerCase().includes(searchQuery.toLowerCase()) ||
      initiative.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (initiative.assignee?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    
    return statusMatch && priorityMatch && searchMatch
  })

  // インライン編集の開始
  const startEditing = (initiativeId: string, field: string, currentValue: string) => {
    setEditing({
      initiativeId,
      field,
      value: currentValue
    })
  }

  // インライン編集の保存
  const saveInlineEdit = () => {
    if (!editing.initiativeId || !editing.field) return

    setInitiatives(prev => prev.map(initiative => 
      initiative.id === editing.initiativeId 
        ? { 
            ...initiative, 
            [editing.field as keyof Initiative]: editing.value,
            updatedAt: new Date().toISOString().split('T')[0]
          }
        : initiative
    ))

    setEditing({ initiativeId: null, field: null, value: "" })
  }

  // インライン編集のキャンセル
  const cancelInlineEdit = () => {
    setEditing({ initiativeId: null, field: null, value: "" })
  }

  // ステータス変更（インライン）
  const changeStatus = (initiativeId: string, newStatus: InitiativeStatus) => {
    setInitiatives(prev => prev.map(initiative => 
      initiative.id === initiativeId 
        ? { 
            ...initiative, 
            status: newStatus,
            updatedAt: new Date().toISOString().split('T')[0]
          }
        : initiative
    ))
  }

  // 優先度変更（インライン）
  const changePriority = (initiativeId: string, newPriority: "高" | "中" | "低") => {
    setInitiatives(prev => prev.map(initiative => 
      initiative.id === initiativeId 
        ? { 
            ...initiative, 
            priority: newPriority,
            updatedAt: new Date().toISOString().split('T')[0]
          }
        : initiative
    ))
  }

  // 新規作成/編集の処理
  const handleSubmit = () => {
    if (editingInitiative) {
      // 編集
      setInitiatives(prev => prev.map(initiative => 
        initiative.id === editingInitiative.id 
          ? { ...initiative, ...formData, updatedAt: new Date().toISOString().split('T')[0] }
          : initiative
      ))
    } else {
      // 新規作成
      const newInitiative: Initiative = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      }
      setInitiatives(prev => [...prev, newInitiative])
    }
    
    resetForm()
    setIsDialogOpen(false)
  }

  // 削除処理
  const handleDelete = (id: string) => {
    setInitiatives(prev => prev.filter(initiative => initiative.id !== id))
  }

  // 編集開始
  const handleEdit = (initiative: Initiative) => {
    setEditingInitiative(initiative)
    setFormData({
      status: initiative.status,
      issue: initiative.issue,
      cause: initiative.cause,
      action: initiative.action,
      result: initiative.result,
      priority: initiative.priority,
      assignee: initiative.assignee || "",
      dueDate: initiative.dueDate || ""
    })
    setIsDialogOpen(true)
  }

  // フォームリセット
  const resetForm = () => {
    setEditingInitiative(null)
    setFormData({
      status: InitiativeStatus.PLANNED,
      issue: "",
      cause: "",
      action: "",
      result: "",
      priority: "中",
      assignee: "",
      dueDate: ""
    })
  }

  // ステータスの色とアイコンを取得
  const getStatusBadge = (status: InitiativeStatus, initiativeId: string, isClickable = true) => {
    const statusConfig = {
      [InitiativeStatus.PLANNED]: { 
        color: "bg-gray-100 text-gray-800 border-gray-300", 
        icon: Clock, 
        hoverColor: "hover:bg-gray-200" 
      },
      [InitiativeStatus.IN_PROGRESS]: { 
        color: "bg-blue-100 text-blue-800 border-blue-300", 
        icon: Settings, 
        hoverColor: "hover:bg-blue-200" 
      },
      [InitiativeStatus.COMPLETED]: { 
        color: "bg-green-100 text-green-800 border-green-300", 
        icon: CheckCircle, 
        hoverColor: "hover:bg-green-200" 
      },
      [InitiativeStatus.ON_HOLD]: { 
        color: "bg-yellow-100 text-yellow-800 border-yellow-300", 
        icon: AlertCircle, 
        hoverColor: "hover:bg-yellow-200" 
      },
      [InitiativeStatus.CANCELLED]: { 
        color: "bg-red-100 text-red-800 border-red-300", 
        icon: X, 
        hoverColor: "hover:bg-red-200" 
      }
    }

    const config = statusConfig[status]
    const Icon = config.icon

    if (!isClickable) {
      return (
        <Badge className={`flex items-center gap-1 ${config.color} border`}>
          <Icon className="h-3 w-3" />
          {status}
        </Badge>
      )
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Badge className={`flex items-center gap-1 ${config.color} border cursor-pointer transition-colors ${config.hoverColor}`}>
            <Icon className="h-3 w-3" />
            {status}
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {Object.values(InitiativeStatus).map(statusOption => (
            <DropdownMenuItem 
              key={statusOption} 
              onClick={() => changeStatus(initiativeId, statusOption)}
              className={status === statusOption ? "bg-blue-50" : ""}
            >
              {statusOption}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // 優先度バッジ
  const getPriorityBadge = (priority: "高" | "中" | "低", initiativeId: string, isClickable = true) => {
    const priorityConfig = {
      "高": { 
        color: "bg-red-100 text-red-800 border-red-300", 
        hoverColor: "hover:bg-red-200" 
      },
      "中": { 
        color: "bg-yellow-100 text-yellow-800 border-yellow-300", 
        hoverColor: "hover:bg-yellow-200" 
      },
      "低": { 
        color: "bg-green-100 text-green-800 border-green-300", 
        hoverColor: "hover:bg-green-200" 
      }
    }

    const config = priorityConfig[priority]

    if (!isClickable) {
      return (
        <Badge className={`${config.color} border`}>
          {priority}
        </Badge>
      )
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Badge className={`${config.color} border cursor-pointer transition-colors ${config.hoverColor}`}>
            {priority}
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {(["高", "中", "低"] as const).map(priorityOption => (
            <DropdownMenuItem 
              key={priorityOption} 
              onClick={() => changePriority(initiativeId, priorityOption)}
              className={priority === priorityOption ? "bg-blue-50" : ""}
            >
              {priorityOption}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // インライン編集可能なテキスト
  const EditableText = ({ 
    initiativeId, 
    field, 
    value, 
    multiline = false, 
    placeholder = "クリックして編集",
    className = ""
  }: {
    initiativeId: string
    field: string
    value: string
    multiline?: boolean
    placeholder?: string
    className?: string
  }) => {
    const isEditing = editing.initiativeId === initiativeId && editing.field === field

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          {multiline ? (
            <Textarea
              value={editing.value}
              onChange={(e) => setEditing(prev => ({ ...prev, value: e.target.value }))}
              className="min-h-[60px] text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  saveInlineEdit()
                } else if (e.key === 'Escape') {
                  cancelInlineEdit()
                }
              }}
            />
          ) : (
            <Input
              value={editing.value}
              onChange={(e) => setEditing(prev => ({ ...prev, value: e.target.value }))}
              className="text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveInlineEdit()
                } else if (e.key === 'Escape') {
                  cancelInlineEdit()
                }
              }}
            />
          )}
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={saveInlineEdit}>
              <Save className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelInlineEdit}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div
        className={cn(
          "cursor-pointer hover:bg-gray-50 rounded p-1 transition-colors",
          "min-h-[20px] text-sm",
          !value && "text-gray-400",
          className
        )}
        onClick={() => startEditing(initiativeId, field, value)}
        title="クリックして編集"
      >
        {value || placeholder}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">施策管理</h2>
          <p className="text-gray-600">課題に対する施策の進捗状況を管理します</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              新規作成
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInitiative ? "施策を編集" : "新しい施策を作成"}
              </DialogTitle>
              <DialogDescription>
                課題に対する施策の詳細を入力してください
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">対応状況</label>
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as InitiativeStatus }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(InitiativeStatus).map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">優先度</label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as "高" | "中" | "低" }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="高">高</SelectItem>
                      <SelectItem value="中">中</SelectItem>
                      <SelectItem value="低">低</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">担当者</label>
                  <Input
                    value={formData.assignee}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
                    placeholder="担当者名を入力"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">期限</label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">課題</label>
                  <Textarea
                    value={formData.issue}
                    onChange={(e) => setFormData(prev => ({ ...prev, issue: e.target.value }))}
                    placeholder="解決したい課題を入力"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">原因</label>
                  <Textarea
                    value={formData.cause}
                    onChange={(e) => setFormData(prev => ({ ...prev, cause: e.target.value }))}
                    placeholder="課題の原因を入力"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">実施アクション</label>
                  <Textarea
                    value={formData.action}
                    onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value }))}
                    placeholder="具体的な実施アクションを入力"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">結果及び課題</label>
                  <Textarea
                    value={formData.result}
                    onChange={(e) => setFormData(prev => ({ ...prev, result: e.target.value }))}
                    placeholder="実施結果や新たな課題を入力"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSubmit}>
                {editingInitiative ? "更新" : "作成"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 検索・フィルター */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            検索・フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">キーワード検索</label>
              <Input
                placeholder="課題、担当者などで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">対応状況</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {Object.values(InitiativeStatus).map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">優先度</label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="高">高</SelectItem>
                  <SelectItem value="中">中</SelectItem>
                  <SelectItem value="低">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                <strong>{filteredInitiatives.length}</strong> 件の施策を表示
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 施策リスト */}
      <div className="space-y-4">
        {filteredInitiatives.map((initiative) => (
          <Card key={initiative.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusBadge(initiative.status, initiative.id)}
                  {getPriorityBadge(initiative.priority, initiative.id)}
                  {initiative.assignee && (
                    <Badge variant="outline" className="text-blue-600 border-blue-600 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <EditableText
                        initiativeId={initiative.id}
                        field="assignee"
                        value={initiative.assignee}
                        placeholder="担当者未設定"
                        className="border-none p-0 hover:bg-transparent text-blue-600"
                      />
                    </Badge>
                  )}
                  {initiative.dueDate && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <EditableText
                        initiativeId={initiative.id}
                        field="dueDate"
                        value={initiative.dueDate}
                        placeholder="期限未設定"
                        className="border-none p-0 hover:bg-transparent text-orange-600"
                      />
                    </Badge>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(initiative)}>
                      <Edit className="h-4 w-4 mr-2" />
                      フォームで編集
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(initiative.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-600 mb-2 flex items-center gap-1">
                      🎯 課題
                    </h4>
                    <EditableText
                      initiativeId={initiative.id}
                      field="issue"
                      value={initiative.issue}
                      multiline
                      placeholder="課題を入力してください"
                      className="bg-red-50 border-red-200 rounded-md"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-600 mb-2 flex items-center gap-1">
                      🔍 原因
                    </h4>
                    <EditableText
                      initiativeId={initiative.id}
                      field="cause"
                      value={initiative.cause}
                      multiline
                      placeholder="原因を入力してください"
                      className="bg-orange-50 border-orange-200 rounded-md"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-600 mb-2 flex items-center gap-1">
                      ⚡ 実施アクション
                    </h4>
                    <EditableText
                      initiativeId={initiative.id}
                      field="action"
                      value={initiative.action}
                      multiline
                      placeholder="実施アクションを入力してください"
                      className="bg-blue-50 border-blue-200 rounded-md"
                    />
                  </div>
                  {initiative.result && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 mb-2 flex items-center gap-1">
                        📊 結果及び課題
                      </h4>
                      <EditableText
                        initiativeId={initiative.id}
                        field="result"
                        value={initiative.result}
                        multiline
                        placeholder="結果や新たな課題を入力してください"
                        className="bg-green-50 border-green-200 rounded-md"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t text-xs text-gray-500 flex justify-between items-center">
                <span>作成: {initiative.createdAt}</span>
                <span>更新: {initiative.updatedAt}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInitiatives.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">施策が見つかりません</p>
              <p className="text-sm">検索条件を変更するか、新しい施策を作成してください</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
