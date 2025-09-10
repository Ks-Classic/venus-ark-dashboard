"use client"

import { useState, useEffect } from "react"
import useSWR, { mutate } from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Plus, 
  Search, 
  Filter, 
  GitBranch, 
  Calendar, 
  User, 
  ChevronRight,
  History,
  Edit,
  Settings,
  Loader2,
  ChevronDown
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  InitiativeDetail, 
  InitiativeWithHistory,
  InitiativeVersion,
  InitiativeStatus, 
  InitiativeCategory, 
  Priority,
  VersionComparison
} from "@/lib/types/initiative"
import { 
  getStatusDisplay, 
  getCategoryDisplay, 
  getPriorityDisplay, 
  formatDate, 
  getRelativeTime,
  compareVersions
} from "@/lib/initiative-utils"
import { useToast } from "@/components/ui/use-toast"

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('ネットワーク応答が正しくありませんでした');
  }
  return res.json();
});

const INITIATIVES_API_ENDPOINT = '/api/initiatives';

interface InitiativesDashboardV2Props {
  isSidePanelCollapsed: boolean;
}

export function InitiativesDashboardV2({ isSidePanelCollapsed }: InitiativesDashboardV2Props) {
  const { toast } = useToast();

  // フィルター状態
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterStatuses, setFilterStatuses] = useState<string[]>([
    InitiativeStatus.PLANNED,
    InitiativeStatus.IN_PROGRESS,
  ]);
  const [searchQuery, setSearchQuery] = useState("")

  // データフェッチ用のURLを動的に生成
  const apiUrl = () => {
    const params = new URLSearchParams();
    if (filterCategory !== 'all') {
      params.append('category', filterCategory);
    }
    filterStatuses.forEach(status => {
      params.append('status', status);
    });
    if (searchQuery) {
      params.append('searchQuery', searchQuery);
    }
    return `${INITIATIVES_API_ENDPOINT}?${params.toString()}`;
  }

  const { data: initiatives = [], error, isLoading } = useSWR<InitiativeDetail[]>(apiUrl, fetcher);

  // ステート管理
  const [selectedInitiative, setSelectedInitiative] = useState<InitiativeDetail | null>(null)
  const [selectedInitiativeHistory, setSelectedInitiativeHistory] = useState<InitiativeWithHistory | null>(null)
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  // バージョン比較状態
  const [comparisonFrom, setComparisonFrom] = useState<number | null>(null)
  const [comparisonTo, setComparisonTo] = useState<number | null>(null)
  const [versionComparison, setVersionComparison] = useState<VersionComparison | null>(null)
  
  // 新規作成・編集用の状態
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInitiative, setEditingInitiative] = useState<InitiativeDetail | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: InitiativeCategory.RECRUITMENT,
    status: InitiativeStatus.PLANNED,
    priority: Priority.MEDIUM,
    assignee: '',
    dueDate: '',
    issue: '',
    cause: '',
    action: '',
    result: '',
    changeReason: '',
  })

  // 施策がロードされたら最初のものを選択
  useEffect(() => {
    if (!selectedInitiative && initiatives.length > 0) {
      setSelectedInitiative(initiatives[0]);
    } else if (initiatives.length === 0) {
      setSelectedInitiative(null);
    }
  }, [initiatives, selectedInitiative]);


  // 選択した施策の履歴を取得
  useEffect(() => {
    const fetchInitiativeHistory = async () => {
      if (!selectedInitiative) {
        setSelectedInitiativeHistory(null);
        return;
      };
      
      try {
        const historyData = await fetcher(`/api/initiatives/${selectedInitiative.id}`) as InitiativeWithHistory;
        setSelectedInitiativeHistory(historyData);
      } catch (err) {
        console.error('Error fetching initiative history:', err);
        toast({
          title: "エラー",
          description: "施策履歴の取得に失敗しました。",
          variant: "destructive",
        })
      }
    }

    fetchInitiativeHistory()
  }, [selectedInitiative, toast])

  const handleStatusFilterChange = (status: InitiativeStatus) => {
    setFilterStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // バージョン比較の実行
  const handleVersionComparison = () => {
    if (!selectedInitiativeHistory || !selectedInitiativeHistory.versions || comparisonFrom === null || comparisonTo === null) return
    
    const fromVersion = selectedInitiativeHistory.versions.find(v => v.version === comparisonFrom)
    const toVersion = selectedInitiativeHistory.versions.find(v => v.version === comparisonTo)
    
    if (fromVersion && toVersion) {
      const comparison = compareVersions(fromVersion, toVersion)
      setVersionComparison(comparison)
    }
  }

  // 新規作成・編集のハンドラー
  const handleCreateNew = () => {
    setEditingInitiative(null);
    setFormData({
      title: '',
      category: InitiativeCategory.RECRUITMENT,
      status: InitiativeStatus.PLANNED,
      priority: Priority.MEDIUM,
      assignee: '',
      dueDate: '',
      issue: '',
      cause: '',
      action: '',
      result: '',
      changeReason: '初回作成',
    })
    setIsModalOpen(true)
  }

  const handleEditInitiative = () => {
    if (selectedInitiative) {
      setEditingInitiative(selectedInitiative)
      setFormData({
        title: selectedInitiative.title,
        category: selectedInitiative.category,
        status: selectedInitiative.status,
        priority: selectedInitiative.priority,
        assignee: selectedInitiative.assignee || '',
        dueDate: selectedInitiative.dueDate ? new Date(selectedInitiative.dueDate).toISOString().split('T')[0] : '',
        issue: selectedInitiative.currentVersionData?.issue || '',
        cause: selectedInitiative.currentVersionData?.cause || '',
        action: selectedInitiative.currentVersionData?.action || '',
        result: selectedInitiative.currentVersionData?.result || '',
        changeReason: '',
      })
      setIsModalOpen(true)
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingInitiative(null)
  }

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (editingInitiative && !formData.changeReason) {
      toast({
        title: "入力エラー",
        description: "変更理由を入力してください。",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    const endpoint = editingInitiative 
      ? `/api/initiatives/${editingInitiative.id}` 
      : '/api/initiatives';
    const method = editingInitiative ? 'PUT' : 'POST';
    
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      toast({
        title: "成功",
        description: `施策が${editingInitiative ? '更新' : '作成'}されました。`,
      });
      
      handleModalClose();
      mutate(apiUrl());
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast({
        title: "エラー",
        description: error.message || '保存に失敗しました。',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 施策カードコンポーネント
  const InitiativeCard = ({ initiative }: { initiative: InitiativeDetail }) => {
    const statusDisplay = getStatusDisplay(initiative.status)
    const categoryDisplay = getCategoryDisplay(initiative.category)
    const priorityDisplay = getPriorityDisplay(initiative.priority)
    const isSelected = selectedInitiative?.id === initiative.id

    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
        }`}
        onClick={() => setSelectedInitiative(initiative)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-2 line-clamp-2">{initiative.title}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-xs ${categoryDisplay.color} border`}>
                  <span className="mr-1">{categoryDisplay.icon}</span>
                  {initiative.category}
                </Badge>
                <Badge className={`text-xs ${statusDisplay.color} border`}>
                  <span className="mr-1">{statusDisplay.icon}</span>
                  {initiative.status}
                </Badge>
                <Badge className={`text-xs ${priorityDisplay.color} border`}>
                  <span className="mr-1">{priorityDisplay.icon}</span>
                  {initiative.priority}
                </Badge>
              </div>
            </div>
            {isSelected && <ChevronRight className="h-4 w-4 text-blue-500" />}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-xs text-gray-600">
            {initiative.assignee && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{initiative.assignee}</span>
              </div>
            )}
            {initiative.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(initiative.dueDate)}</span>
              </div>
            )}
            <div className="text-xs text-gray-500">
              v{initiative.currentVersion} • {getRelativeTime(new Date(initiative.updatedAt))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 履歴アイテムコンポーネント
  const HistoryItem = ({ version }: { version: InitiativeVersion }) => {
    const statusDisplay = getStatusDisplay(version.status)
    const priorityDisplay = getPriorityDisplay(version.priority)

    return (
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              v{version.version}
            </Badge>
            <span className="text-sm text-gray-600">
              {formatDate(new Date(version.createdAt as unknown as string))}
            </span>
            <span className="text-xs text-gray-500">
              ({getRelativeTime(new Date(version.createdAt as unknown as string))})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (comparisonFrom === version.version) {
                setComparisonFrom(null)
              } else if (comparisonTo === version.version) {
                setComparisonTo(null)
              } else if (comparisonFrom === null) {
                setComparisonFrom(version.version)
              } else if (comparisonTo === null) {
                setComparisonTo(version.version)
              }
            }}
            className={`text-xs ${
              comparisonFrom === version.version || comparisonTo === version.version
                ? 'bg-blue-100 text-blue-700'
                : ''
            }`}
          >
            比較に追加
          </Button>
        </div>
        
        {version.changeReason && (
          <div className="text-sm text-gray-700 bg-gray-50 rounded p-2">
            <strong>変更理由：</strong> {version.changeReason}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <Badge className={`text-xs ${statusDisplay.color} border mb-2`}>
              <span className="mr-1">{statusDisplay.icon}</span>
              {version.status}
            </Badge>
          </div>
          <div>
            <Badge className={`text-xs ${priorityDisplay.color} border mb-2`}>
              <span className="mr-1">{priorityDisplay.icon}</span>
              {version.priority}
            </Badge>
          </div>
        </div>
      </div>
    )
  }

  // 現在の状態表示コンポーネント
  const CurrentStateDisplay = () => {
    if (!selectedInitiative?.currentVersionData) return null

    const { currentVersionData } = selectedInitiative

    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">現在の状態</h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-sm text-red-800 mb-2 flex items-center gap-2">🎯 課題</h4>
            <p className="text-sm text-red-700">{currentVersionData.issue}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-medium text-sm text-orange-800 mb-2 flex items-center gap-2">🔍 原因</h4>
            <p className="text-sm text-orange-700">{currentVersionData.cause}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-sm text-blue-800 mb-2 flex items-center gap-2">⚡ アクション</h4>
            <p className="text-sm text-blue-700 whitespace-pre-line">{currentVersionData.action}</p>
          </div>
          {currentVersionData.result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-sm text-green-800 mb-2 flex items-center gap-2">📊 結果・効果</h4>
              <p className="text-sm text-green-700 whitespace-pre-line">{currentVersionData.result}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">施策を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error.message}</p>
        <Button onClick={() => mutate(apiUrl())}>再試行</Button>
      </div>
    )
  }

  return (
    <>
    <div className={`h-[800px] flex gap-6 transition-all duration-300`}>
      {/* 左パネル：施策一覧 */}
      <div className={`flex flex-col transition-all duration-300 ${isSidePanelCollapsed ? 'w-0 -ml-6 opacity-0' : 'w-1/2'}`}>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">施策管理</h2>
              <p className="text-sm text-gray-600">全 {initiatives.length} 件の施策</p>
            </div>
            <Button className="flex items-center gap-2" onClick={handleCreateNew}>
              <Plus className="h-4 w-4" />
              新規作成
            </Button>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4" />フィルター</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="カテゴリ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべてのカテゴリ</SelectItem>
                    {Object.values(InitiativeCategory).map(category => (<SelectItem key={category} value={category}>{category}</SelectItem>))}
                  </SelectContent>
                </Select>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-xs w-full justify-between">
                      ステータス ({filterStatuses.length}) <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>表示するステータス</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.values(InitiativeStatus).map((status) => (
                      <DropdownMenuCheckboxItem
                        key={status}
                        checked={filterStatuses.includes(status)}
                        onCheckedChange={() => handleStatusFilterChange(status)}
                      >
                        {status}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="施策、担当者で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3">
            {initiatives.map((initiative) => (
              <InitiativeCard key={initiative.id} initiative={initiative} />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* 右パネル：施策詳細 */}
      <div className={`flex flex-col transition-all duration-300 ${isSidePanelCollapsed ? 'w-full' : 'w-1/2'}`}>
        {selectedInitiative ? (
          <Card className="flex-1 flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg mb-2">{selectedInitiative.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getCategoryDisplay(selectedInitiative.category).color}>{getCategoryDisplay(selectedInitiative.category).icon} {selectedInitiative.category}</Badge>
                    <Badge className={getStatusDisplay(selectedInitiative.status).color}>{getStatusDisplay(selectedInitiative.status).icon} {selectedInitiative.status}</Badge>
                    <Badge className={getPriorityDisplay(selectedInitiative.priority).color}>{getPriorityDisplay(selectedInitiative.priority).icon} {selectedInitiative.priority}</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleEditInitiative}>
                  <Edit className="h-4 w-4 mr-2" />編集
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-6">
                  <CurrentStateDisplay />
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2"><History className="h-5 w-5" />変更履歴</h3>
                      {selectedInitiativeHistory && selectedInitiativeHistory.versions && (
                        <Badge variant="outline">{selectedInitiativeHistory.versions.length} バージョン</Badge>
                      )}
                    </div>
                    {selectedInitiativeHistory && selectedInitiativeHistory.versions && (
                      <div className="space-y-3">
                        {selectedInitiativeHistory.versions
                          .sort((a, b) => b.version - a.version)
                          .slice(0, showAllHistory ? selectedInitiativeHistory.versions.length : 3)
                          .map((version) => (
                            <HistoryItem key={version.id} version={version} />
                        ))}
                      </div>
                    )}
                    {selectedInitiativeHistory && selectedInitiativeHistory.versions && selectedInitiativeHistory.versions.length > 3 && (
                      <Button variant="link" className="mt-2" onClick={() => setShowAllHistory(!showAllHistory)}>
                        {showAllHistory ? '一部を隠す' : `残り ${selectedInitiativeHistory.versions.length - 3} 件を表示`}
                      </Button>
                    )}
                  </div>
                  {comparisonFrom && comparisonTo && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-lg flex items-center gap-2"><GitBranch className="h-5 w-5" />バージョ���比較</h3>
                          <Button onClick={handleVersionComparison} size="sm" disabled={!comparisonFrom || !comparisonTo}>
                            v{comparisonFrom} ⇄ v{comparisonTo} 比較
                          </Button>
                        </div>
                        {versionComparison && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-medium mb-3">変更内容</h4>
                            <div className="space-y-2">
                              {versionComparison.differences.map((diff, index) => (
                                <div key={index} className="text-sm">
                                  <strong>{diff.fieldLabel}:</strong>
                                  <div className="ml-4 mt-1">
                                    <div className="text-red-600">- {diff.oldValue}</div>
                                    <div className="text-green-600">+ {diff.newValue}</div>
                                  </div>
                                </div>
                              ))}
                              {versionComparison.differences.length === 0 && (<p className="text-gray-500">変更はありません</p>)}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>施策を選択してください</p>
            </div>
          </Card>
        )}
      </div>
    </div>

    {/* 新規作成・編集モーダル */}
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingInitiative ? '施策編集' : '新規施策作成'}</DialogTitle>
          <DialogDescription>
            {editingInitiative ? '施策の内容を編集します。変更内容は新しいバージョンとして保存されます。' : '新しい施策を作成します。必要な情報を入力してください。'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} className="space-y-4 p-1">
          <ScrollArea className="h-[60vh] p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">施策タイトル *</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
              </div>
              <div>
                <Label htmlFor="assignee">担当者</Label>
                <Input id="assignee" value={formData.assignee} onChange={(e) => setFormData({...formData, assignee: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="category">カテゴリ *</Label>
                <Select value={formData.category} onValueChange={(value: InitiativeCategory) => setFormData({...formData, category: value})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.values(InitiativeCategory).map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">ステータス *</Label>
                <Select value={formData.status} onValueChange={(value: InitiativeStatus) => setFormData({...formData, status: value})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.values(InitiativeStatus).map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">優先度 *</Label>
                <Select value={formData.priority} onValueChange={(value: Priority) => setFormData({...formData, priority: value})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.values(Priority).map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDate">期限</Label>
                <Input id="dueDate" type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} />
              </div>
            </div>
            <div>
              <Label htmlFor="issue">課題・問題 *</Label>
              <Textarea id="issue" value={formData.issue} onChange={(e) => setFormData({...formData, issue: e.target.value})} required />
            </div>
            <div>
              <Label htmlFor="cause">原因分析</Label>
              <Textarea id="cause" value={formData.cause} onChange={(e) => setFormData({...formData, cause: e.target.value})} />
            </div>
            <div>
              <Label htmlFor="action">施策・対策 *</Label>
              <Textarea id="action" value={formData.action} onChange={(e) => setFormData({...formData, action: e.target.value})} required />
            </div>
            <div>
              <Label htmlFor="result">結果・成果</Label>
              <Textarea id="result" value={formData.result} onChange={(e) => setFormData({...formData, result: e.target.value})} />
            </div>
            {editingInitiative && (
              <div>
                <Label htmlFor="changeReason">変更理由 *</Label>
                <Input id="changeReason" value={formData.changeReason} onChange={(e) => setFormData({...formData, changeReason: e.target.value})} required />
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleModalClose} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                editingInitiative ? '更新' : '作成'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}