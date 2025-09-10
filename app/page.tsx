"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Users, UserCheck, MessageSquare, PanelLeftClose, PanelRightClose } from "lucide-react"
import { WorkStatusDashboard } from "@/components/work-status-dashboard"
import RecruitmentDashboard from "@/components/recruitment-dashboard"
import { InitiativesDashboardV2 } from "@/components/initiatives-dashboard-v2"
import { PeriodSelector, usePeriodSelection } from "@/components/ui/period-selector"
import { Button } from "@/components/ui/button"

export default function VenusArkDashboard() {
  const [activeTab, setActiveTab] = useState("staff")
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState(false)

  // 共通期間選択の状態管理
  const {
    selectedYear,
    selectedMonth,
    selectedWeekInMonth,
    setSelectedYear,
    setSelectedMonth,
    setSelectedWeekInMonth
  } = usePeriodSelection();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4">
                <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-200">
                  <img 
                    src="/venus-ark-logo.svg" 
                    alt="Venus Ark Logo" 
                    className="h-16 w-16"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">週次MTGダッシュボード</h1>
                  <p className="text-gray-600 mt-1">活動期間の分析レポートと自動考察</p>
                  <p className="text-sm text-gray-500 mt-1">現在のタブ: {activeTab}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <PeriodSelector
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                selectedWeekInMonth={selectedWeekInMonth}
                onYearChange={setSelectedYear}
                onMonthChange={setSelectedMonth}
                onWeekChange={setSelectedWeekInMonth}
              />
              {activeTab === 'initiatives' && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setIsSidePanelCollapsed(!isSidePanelCollapsed)}
                  title={isSidePanelCollapsed ? "サイドパネルを開く" : "サイドパネルを閉じる"}
                >
                  {isSidePanelCollapsed ? <PanelRightClose className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={(value) => {
          console.log('Tab changed to:', value);
          setActiveTab(value);
        }} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              稼働者状況
            </TabsTrigger>
            <TabsTrigger value="recruitment" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              採用活動
            </TabsTrigger>
            <TabsTrigger value="initiatives" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              施策
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff">
            <WorkStatusDashboard 
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedWeek={selectedWeekInMonth}
            />
          </TabsContent>

          <TabsContent value="recruitment">
            <RecruitmentDashboard 
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedWeek={selectedWeekInMonth}
            />
          </TabsContent>

          <TabsContent value="initiatives">
            <InitiativesDashboardV2 isSidePanelCollapsed={isSidePanelCollapsed} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}