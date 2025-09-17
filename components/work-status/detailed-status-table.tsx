'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SimpleTooltip } from '@/components/ui/simple-tooltip';
import { WeeklyWorkStatusDetail, WeeklyWorkStatusDetailOptimized, FutureWorkersProjection } from '@/lib/types/work_status_report';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FutureMemberDetailsList } from './future-member-details-list';

interface DetailedStatusTableProps {
  weeklyData: WeeklyWorkStatusDetailOptimized;
  futureProjection: FutureWorkersProjection[];
  selectedYear: number;
  selectedMonth: number;
  selectedWeek: number;
}

interface MemberDetail {
  id: string;
  name: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  confidence?: 'high' | 'medium' | 'low';
  projectName?: string;
  reason?: string;
  lastWorkStartDate?: string | null;
  lastWorkEndDate?: string | null;
  contractEndDate?: string | null;
  firstCounselingDate?: string | null;
}

// APIから取得する将来見込みデータの型定義
interface FutureProjectionData {
  month: number;
  year: number;
  totalProjected: number;
  newStarting: {
    count: number;
    members: Array<{
      id: string;
      name: string;
      status: string;
      confidence?: 'high' | 'medium' | 'low';
      startDate?: string;
    }>;
  };
  switching: {
    count: number;
    members: Array<{
      id: string;
      name: string;
      status: string;
      confidence?: 'high' | 'medium' | 'low';
      endDate?: string;
    }>;
  };
  projectEnding: {
    count: number;
    members: Array<{
      id: string;
      name: string;
      status: string;
      confidence?: 'high' | 'medium' | 'low';
      endDate?: string;
      reason?: string;
    }>;
  };
  contractEnding: {
    count: number;
    members: Array<{
      id: string;
      name: string;
      status: string;
      confidence?: 'high' | 'medium' | 'low';
      endDate?: string;
      reason?: string;
    }>;
  };
}

export function DetailedStatusTable({ 
  weeklyData, 
  futureProjection, 
  selectedYear, 
  selectedMonth, 
  selectedWeek 
}: DetailedStatusTableProps) {
  const [activeTab, setActiveTab] = useState('current');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<MemberDetail[]>([]);
  const [dialogTitle, setDialogTitle] = useState('');

  // 実データ取得用の状態管理
  const [futureProjectionData, setFutureProjectionData] = useState<FutureProjectionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 確度選択状態管理
  const [memberConfidence, setMemberConfidence] = useState<{[key: string]: 'high' | 'medium' | 'low' | 'unknown'}>({});
  
  // 月選択状態管理（ローカルストレージベース）
  const [memberMonthAdjustments, setMemberMonthAdjustments] = useState<{[key: string]: number}>({});
  
  // メンバー詳細のキャッシュ管理
  const [memberDetailsCache, setMemberDetailsCache] = useState<{
    [weekKey: string]: {
      newStarted: MemberDetail[];
      switching: MemberDetail[];
      projectEnded: MemberDetail[];
      contractEnded: MemberDetail[];
      counselingStarted: MemberDetail[];
    }
  }>({});

  // ローカルストレージから月選択データを読み込み
  useEffect(() => {
    try {
      const storageKey = `memberMonthAdjustments_${selectedYear}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        setMemberMonthAdjustments(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('ローカルストレージ読み込みエラー:', error);
    }
  }, [selectedYear]);

  // 将来見込みデータを取得（最適化版：将来見込みタブ選択時のみ実行）
  useEffect(() => {
    // 将来見込みタブが選択されている場合のみAPIを呼び出し
    if (activeTab !== 'future') {
      return;
    }

    const fetchFutureProjection = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('🔍 [DEBUG] 将来見込みタブ選択時のみAPI呼び出し開始');
        const response = await fetch(`/api/work-status/future-projection?year=${selectedYear}&month=${selectedMonth}`);
        
        if (!response.ok) {
          throw new Error('将来見込みデータの取得に失敗しました');
        }
        
        const result = await response.json();
        
        if (result.success) {
          setFutureProjectionData(result.data);
          console.log('🔍 [DEBUG] 将来見込みデータ取得完了');
        } else {
          throw new Error(result.error || '将来見込みデータの取得に失敗しました');
        }
        
      } catch (error) {
        console.error('Future projection fetch error:', error);
        setError(error instanceof Error ? error.message : '将来見込みデータの取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchFutureProjection();
  }, [selectedYear, selectedMonth, activeTab]);

  // 月選択変更時の再描画トリガー
  useEffect(() => {
    // memberMonthAdjustmentsが変更されたときに再描画をトリガー
    console.log('🔍 [DEBUG] 月選択が変更されました。再描画中...', memberMonthAdjustments);
  }, [memberMonthAdjustments]);

  // 月選択に基づいてメンバーを適切な月に再配置する関数
  const adjustMembersToSelectedMonths = (originalData: FutureProjectionData[], adjustments: {[key: string]: number}) => {
    if (!originalData || originalData.length === 0) return originalData;

    // 調整されたデータの初期化（元データのコピー）
    const adjustedData = originalData.map(monthData => ({
      ...monthData,
      newStarting: {
        ...monthData.newStarting,
        members: [] as Array<{
          id: string;
          name: string;
          status: string;
          confidence?: 'high' | 'medium' | 'low';
          startDate?: string;
        }>,
        count: 0
      },
      switching: {
        ...monthData.switching,
        members: [] as Array<{
          id: string;
          name: string;
          status: string;
          confidence?: 'high' | 'medium' | 'low';
          endDate?: string;
        }>,
        count: 0
      },
      // totalProjectedは後で再計算する
      totalProjected: monthData.totalProjected
    }));

    // 全メンバーを収集して、調整された月に基づいて再配置
    const allMembers: Array<{
      member: any;
      type: 'newStarting' | 'switching';
      originalMonth: number;
      adjustedMonth?: number;
    }> = [];

    // 元データからメンバーを収集
    originalData.forEach((monthData, monthIndex) => {
      monthData.newStarting.members.forEach(member => {
        allMembers.push({
          member,
          type: 'newStarting',
          originalMonth: monthData.month,
          adjustedMonth: adjustments[member.id]
        });
      });

      monthData.switching.members.forEach(member => {
        allMembers.push({
          member,
          type: 'switching',
          originalMonth: monthData.month,
          adjustedMonth: adjustments[member.id]
        });
      });
    });

    // メンバーを調整された月に配置
    allMembers.forEach(({ member, type, originalMonth, adjustedMonth }) => {
      const targetMonth = adjustedMonth || originalMonth;
      
      // 対象月のデータを見つける
      const targetMonthData = adjustedData.find(data => data.month === targetMonth);
      
      if (targetMonthData) {
        if (type === 'newStarting') {
          targetMonthData.newStarting.members.push(member);
          targetMonthData.newStarting.count = targetMonthData.newStarting.members.length;
        } else if (type === 'switching') {
          targetMonthData.switching.members.push(member);
          targetMonthData.switching.count = targetMonthData.switching.members.length;
        }
      }
    });

    // 各月のtotalProjectedを動的に再計算
    // 基準：最初の月のtotalProjected - 最初の月の新規・切替数 = ベース稼働者数
    const firstMonthData = originalData[0];
    const baseActiveMembers = firstMonthData.totalProjected - 
                             (firstMonthData.newStarting.count + firstMonthData.switching.count) +
                             (firstMonthData.projectEnding.count + firstMonthData.contractEnding.count);

    console.log(`🔍 [DEBUG] ベース稼働者数: ${baseActiveMembers}`);
    console.log(`🔍 [DEBUG] 調整後の内訳: 新規=${adjustedData.map(d => d.newStarting.count)}, 切替=${adjustedData.map(d => d.switching.count)}, 案件終了=${adjustedData.map(d => d.projectEnding.count)}, 契約終了=${adjustedData.map(d => d.contractEnding.count)}`);

    // 累積計算で各月のtotalProjectedを更新
    let cumulativeTotal = baseActiveMembers;
    
    adjustedData.forEach((monthData, index) => {
      // 当月の変化分を計算（調整後のcountを使用）
      const monthlyChange = (monthData.newStarting.count || 0) + 
                           (monthData.switching.count || 0) - 
                           (monthData.projectEnding.count || 0) - 
                           (monthData.contractEnding.count || 0);
      
      // 累積総数を更新
      cumulativeTotal += monthlyChange;
      monthData.totalProjected = cumulativeTotal;
      
      console.log(`🔍 [DEBUG] ${monthData.year}年${monthData.month}月: 前月継続=${cumulativeTotal - monthlyChange}, 調整後内訳(新規=${monthData.newStarting.count}, 切替=${monthData.switching.count}, 案件終了=${monthData.projectEnding.count}, 契約終了=${monthData.contractEnding.count}), 月次変化=${monthlyChange}, 見込総数=${cumulativeTotal}`);
    });

    console.log('🔍 [DEBUG] メンバー再配置・総数再計算完了:', adjustedData);
    return adjustedData;
  };

  // 調整されたデータを取得（useState で管理）
  const [adjustedFutureProjectionData, setAdjustedFutureProjectionData] = useState<FutureProjectionData[]>([]);

  // 将来見込みデータが更新された時に調整データを初期設定
  useEffect(() => {
    if (futureProjectionData && futureProjectionData.length > 0) {
      setAdjustedFutureProjectionData(adjustMembersToSelectedMonths(futureProjectionData, memberMonthAdjustments));
    }
  }, [futureProjectionData, memberMonthAdjustments]);

  // 確度更新関数（ローカルのみ、高速処理）
  const updateMemberConfidence = (memberId: string, confidence: 'high' | 'medium' | 'low' | 'unknown') => {
    // ローカル状態のみ更新（Firestore保存なし）
    setMemberConfidence(prev => ({
      ...prev,
      [memberId]: confidence
    }));
    console.log(`🔍 [DEBUG] メンバー${memberId}の確度を${confidence}に更新（ローカルのみ）`);
  };

  // 月選択更新関数（ローカルのみ）
  const updateMemberMonth = (memberId: string, newMonth: number) => {
    setMemberMonthAdjustments(prev => ({
      ...prev,
      [memberId]: newMonth
    }));
    console.log(`🔍 [DEBUG] メンバー${memberId}の開始月を${newMonth}月に調整（ローカルのみ）`);
    
    // ローカルストレージに保存（永続化）
    try {
      const storageKey = `memberMonthAdjustments_${selectedYear}`;
      const existingData = JSON.parse(localStorage.getItem(storageKey) || '{}');
      existingData[memberId] = newMonth;
      localStorage.setItem(storageKey, JSON.stringify(existingData));
      
      // **重要**: 月変更後にadjustedFutureProjectionDataを再計算してステートを更新
      // これにより表の数値がリアルタイムで更新される
      setAdjustedFutureProjectionData(prev => {
        // 最新のmemberMonthAdjustmentsを使用して再計算
        const updatedAdjustments = { ...memberMonthAdjustments, [memberId]: newMonth };
        return adjustMembersToSelectedMonths(futureProjectionData, updatedAdjustments);
      });
      
      console.log(`✅ [DEBUG] メンバー${memberId}の月変更完了 → 表の数値を再計算しました`);
    } catch (error) {
      console.error('ローカルストレージ保存エラー:', error);
    }
  };

  // 実際のweeklyDataから週ラベルと指標を生成
  const weekLabels = weeklyData.weekDetails.map((detail, index) => ({
    label: detail.weekLabel,
    isPrediction: detail.weekLabel.includes('(予定)'),
    isTarget: index === 2 // 3列目が選択週
  }));

  // 実際のデータから週次指標を生成
  const weeklyMetrics = weeklyData.weekDetails.map(detail => ({
    totalWorkers: detail.totalWorkers,
    newStarted: detail.newStarted,
    switching: detail.switching,
    projectEnded: detail.projectEnded,
    contractEnded: detail.contractEnded,
    counselingStarted: detail.counselingStarted || 0,
    otherLeft: detail.otherLeft || 0
  }));

  // 実際のメンバーデータを取得
  const getActualMembers = (type: string, weekIndex: number): MemberDetail[] => {
    console.log('🔍 [DEBUG] getActualMembers called:', { type, weekIndex });
    console.log('🔍 [DEBUG] weeklyData.weekDetails length:', weeklyData.weekDetails?.length);
    
    if (!weeklyData.weekDetails[weekIndex]) {
      console.log('🔍 [DEBUG] No weekDetail found for weekIndex:', weekIndex);
      return [];
    }
      
    const weekDetail = weeklyData.weekDetails[weekIndex];
    console.log('🔍 [DEBUG] weekDetail:', weekDetail);
    
    switch (type) {
      case 'newStarted':
        const newMembers = weekDetail.startedMembers
          ?.filter(member => member.type === 'new')
          ?.map((member, index) => ({
            id: `new-${weekIndex}-${index}`,
            name: member.memberName,
            projectName: '新規開始',
            lastWorkStartDate: null, // APIから取得する詳細データで上書きされる
            lastWorkEndDate: null,
            contractEndDate: null,
            firstCounselingDate: null
          })) || [];
        console.log('🔍 [DEBUG] newStarted members:', newMembers);
        return newMembers;
      
      case 'switching':
        const switchingMembers = weekDetail.startedMembers
          ?.filter(member => member.type === 'switching')
          ?.map((member, index) => ({
            id: `switching-${weekIndex}-${index}`,
            name: member.memberName,
            projectName: member.previousProject || '切替完了',
            lastWorkStartDate: null,
            lastWorkEndDate: null,
            contractEndDate: null,
            firstCounselingDate: null
          })) || [];
        console.log('🔍 [DEBUG] switching members:', switchingMembers);
        return switchingMembers;
      
      case 'projectEnded':
        const projectEndedMembers = weekDetail.endedMembers
          ?.filter(member => member.type === 'project')
          ?.map((member, index) => ({
            id: `project-${weekIndex}-${index}`,
            name: member.memberName,
            reason: member.reason || '案件終了',
            lastWorkStartDate: null,
            lastWorkEndDate: null,
            contractEndDate: null,
            firstCounselingDate: null
          })) || [];
        console.log('🔍 [DEBUG] projectEnded members:', projectEndedMembers);
        return projectEndedMembers;
      
      case 'contractEnded':
        const contractEndedMembers = weekDetail.endedMembers
          ?.filter(member => member.type === 'contract')
          ?.map((member, index) => ({
            id: `contract-${weekIndex}-${index}`,
            name: member.memberName,
            reason: member.reason || '契約終了',
            lastWorkStartDate: null,
            lastWorkEndDate: null,
            contractEndDate: null,
            firstCounselingDate: null
          })) || [];
        console.log('🔍 [DEBUG] contractEnded members:', contractEndedMembers);
        return contractEndedMembers;
      
      case 'counselingStarted':
        const counselingStartedMembers = weekDetail.otherItems
          ?.filter(item => item.type === 'counseling_start')
          ?.flatMap(item => item.members?.map((memberName, index) => ({
            id: `counseling-${weekIndex}-${index}`,
            name: memberName,
            reason: 'カウンセリング開始',
            lastWorkStartDate: null,
            lastWorkEndDate: null,
            contractEndDate: null,
            firstCounselingDate: null
          })) || []) || [];
        console.log('🔍 [DEBUG] counselingStarted members:', counselingStartedMembers);
        return counselingStartedMembers;
      
      default:
        console.log('🔍 [DEBUG] Unknown type:', type);
        return [];
    }
  };

  // 実際のメンバーデータを取得（詳細情報付き）
  const getActualMembersWithDetails = (type: string, weekIndex: number): MemberDetail[] => {
    console.log('🔍 [DEBUG] getActualMembersWithDetails called (optimized):', { type, weekIndex });
    
    // 最適化: 週次データから直接メンバー詳細を取得
    const weekDetail = weeklyData.weekDetails[weekIndex];
    if (!weekDetail?.memberDetails) {
      console.log('🔍 [DEBUG] No memberDetails found, falling back to basic members');
      return getActualMembers(type, weekIndex);
    }
    
    let memberDetailsArray: any[] = [];
    
    switch (type) {
      case 'newStarted':
        memberDetailsArray = weekDetail.memberDetails.newStarted;
        break;
      case 'switching':
        memberDetailsArray = weekDetail.memberDetails.switching;
        break;
      case 'projectEnded':
        memberDetailsArray = weekDetail.memberDetails.projectEnded;
        break;
      case 'contractEnded':
        memberDetailsArray = weekDetail.memberDetails.contractEnded;
        break;
      case 'counselingStarted':
        memberDetailsArray = weekDetail.memberDetails.counselingStarted;
        break;
      default:
        console.log('🔍 [DEBUG] Unknown type, falling back to basic members:', type);
        return getActualMembers(type, weekIndex);
    }
    
    console.log('🔍 [DEBUG] Raw memberDetails from weeklyData:', memberDetailsArray);
    
    // メンバー詳細データを変換
    const detailedMembers = memberDetailsArray.map((member: any) => {
      console.log('🔍 [DEBUG] Processing member from weeklyData:', member);
      
      const processedMember = {
        id: member.id,
        name: member.name,
        startDate: member.lastWorkStartDate ? new Date(member.lastWorkStartDate) : undefined,
        endDate: member.lastWorkEndDate ? new Date(member.lastWorkEndDate) : undefined,
        status: member.status,
        projectName: member.projectName,
        reason: member.reason,
        lastWorkStartDate: member.lastWorkStartDate,
        lastWorkEndDate: member.lastWorkEndDate,
        contractEndDate: member.contractEndDate,
        firstCounselingDate: member.firstCounselingDate
      };
      
      console.log('🔍 [DEBUG] Processed member (optimized):', processedMember);
      return processedMember;
    });
    
    console.log('🔍 [DEBUG] All processed detailed members (optimized):', detailedMembers);
    return detailedMembers;
  };

  // セル値クリック時の処理（最適化済み）
  const handleCellClick = (cellId: string, value: number, type: string, weekIndex: number) => {
    console.log('🔍 [DEBUG] handleCellClick called (optimized):', { cellId, value, type, weekIndex });
    
    if (value === 0) {
      console.log('🔍 [DEBUG] Value is 0, returning early');
      return;
    }
    
    console.log('🔍 [DEBUG] Getting detailed members for type:', type, 'weekIndex:', weekIndex);
    const members = getActualMembersWithDetails(type, weekIndex);
    console.log('🔍 [DEBUG] Retrieved detailed members (optimized):', members);
    
    setSelectedMembers(members);
    
    // 週ラベルを取得
    const weekLabel = weeklyData.weekDetails[weekIndex]?.weekLabel || `${weekIndex + 1}週目`;
    setDialogTitle(`${weekLabel} - ${getTypeLabel(type)}`);
    console.log('🔍 [DEBUG] Opening dialog with title:', `${weekLabel} - ${getTypeLabel(type)}`);
    setIsDetailDialogOpen(true);
  };

  // 各指標の定義と判定方法（現在の稼働状況）
  // 注意: 案件終了と切替完了は同じ週に重複する可能性があります
  const metricDefinitions = {
    totalWorkers: {
      definition: '指定時点で稼働中のメンバー総数',
      method: '以下の条件をすべて満たすメンバーをカウント：\n• 最新業務開始日が対象週終了日以前\n• かつ以下のいずれか：\n  - 最新業務終了日が空白\n  - 終了日が開始日より前（再稼働パターン）\n  - 対象週終了日以降'
    },
    newStarted: {
      definition: 'その週に初めて稼働を開始したメンバー数',
      method: '以下の条件をすべて満たすメンバーをカウント：\n• 最新業務開始日が週範囲内\n• 最新業務終了日が存在しない（終了履歴がない）'
    },
    switching: {
      definition: '前の案件を終了し、新しい案件に切替えたメンバー数',
      method: '以下の条件をすべて満たすメンバーをカウント：\n• 最新業務終了日が存在する\n• 最新業務終了日 < 最新業務開始日（終了日が開始日より前）\n• 最新業務開始日が週範囲内'
    },
    projectEnded: {
      definition: 'その週に案件を終了したメンバー数',
      method: '以下の条件をすべて満たすメンバーをカウント：\n• 最新業務終了日が週範囲内\n• 契約終了日と異なる日付（契約終了と区別）'
    },
    contractEnded: {
      definition: 'その週に契約を終了したメンバー数',
      method: '以下の条件を満たすメンバーをカウント：\n• 契約終了日が週範囲内'
    },
    counselingStarted: {
      definition: 'その週に初回カウンセリングを実施したメンバー数',
      method: '以下の条件を満たすメンバーをカウント：\n• 初回実施日が週範囲内'
    },
    otherLeft: {
      definition: '稼働外の任意離脱レコード（現在未実装）',
      method: '現在は常に0（未実装）'
    }
  };

  // 将来見込み指標の定義と判定方法
  const futureMetricDefinitions = {
    totalProjected: {
      definition: '該当月に実際に稼働する（予定を含む）メンバーの正確な総数',
      method: '以下の計算式で算出：\n• 継続稼働者数\n• + 新規開始人数\n• + 切替完了人数\n• - 案件終了人数\n• - 契約終了人数'
    },
    totalStarting: {
      definition: 'その月に新たに稼働を開始する見込みのメンバー総数',
      method: '以下の合計で算出：\n• 新規開始見込み人数\n• + 切替完了見込み人数'
    },
    newStarting: {
      definition: 'その月に新たに稼働を開始する見込みのメンバー数',
      method: '以下のいずれかの条件を満たすメンバーをカウント：\n• 最新業務開始日が該当月内\n• または Notionステータスが以下のいずれか かつ 最新業務開始日がない：\n  - 案件斡旋\n  - 面接対策\n  - 面接\n  - 結果待ち\n  - 採用'
    },
    switchingCompleted: {
      definition: 'その月に案件切替を完了する見込みのメンバー数',
      method: '以下のいずれかの条件を満たすメンバーをカウント：\n• 最新業務終了日が存在し、それより後、かつ該当月内に最新業務開始日\n• または 最新業務終了日が存在し、Notionステータスが以下のいずれか：\n  - 案件斡旋\n  - 面接対策\n  - 面接\n  - 結果待ち\n  - 採用'
    },
    totalEnding: {
      definition: 'その月に稼働を終了する見込みのメンバー総数',
      method: '以下の合計で算出：\n• 案件終了見込み人数\n• + 契約終了見込み人数'
    },
    projectEnding: {
      definition: 'その月に案件を終了する見込みのメンバー数',
      method: '以下の条件を満たすメンバーをカウント：\n• 最新業務終了日が該当月内'
    },
    contractEnding: {
      definition: 'その月に契約を終了する見込みのメンバー数',
      method: '以下の条件を満たすメンバーをカウント：\n• 契約終了日が該当月内'
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      newStarted: '新規開始人数',
      switching: '切替完了人数',
      projectEnded: '案件終了人数',
      contractEnded: '契約終了人数',
      counselingStarted: 'カウンセリング開始人数',
      otherLeft: 'その他離脱人数'
    };
    return labels[type] || type;
  };

  // セル値表示コンポーネント
  const CellWithClick = ({ 
    cellId, 
    value, 
    type, 
    weekIndex, 
    className = "" 
  }: { 
    cellId: string; 
    value: number; 
    type: string; 
    weekIndex: number; 
    className?: string; 
  }) => {
    const isClickable = value > 0;
    
    return (
      <span 
        className={`${isClickable ? 'cursor-pointer text-blue-600 hover:text-blue-800 hover:underline' : ''} ${className}`}
        onClick={() => isClickable && handleCellClick(cellId, value, type, weekIndex)}
      >
        {value > 0 && (
          <span className="inline-flex items-center">
            {value}
            <span className="ml-1 text-orange-500 font-bold">●</span>
          </span>
        )}
        {value === 0 && value}
      </span>
    );
  };

  // 現在の稼働状況メンバー詳細を表示するコンポーネント（最適化版）
  const CurrentItemDetails = () => {
    // 選択された週（3列目）のデータのみを表示
    const selectedWeekIndex = 2; // 3列目（0-indexed）
    const selectedWeekDetail = weeklyData.weekDetails[selectedWeekIndex];
    const weekKey = `${selectedYear}-${selectedMonth}-${selectedWeek}`;
    
    const [detailedMemberData, setDetailedMemberData] = useState<{
      newStarted: MemberDetail[];
      switching: MemberDetail[];
      projectEnded: MemberDetail[];
      contractEnded: MemberDetail[];
      counselingStarted: MemberDetail[];
    } | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    
    console.log('🔍 [DEBUG] CurrentItemDetails - selectedWeekDetail:', selectedWeekDetail);
    
    if (!selectedWeekDetail) {
      console.log('🔍 [DEBUG] CurrentItemDetails - No selectedWeekDetail found');
      return null;
    }

    // 詳細データを取得する関数（最適化済み）
    const loadDetailedMemberData = () => {
      console.log('🔍 [DEBUG] 週次データから直接メンバー詳細を取得 (最適化済み):', weekKey);
      
      const memberDetails = {
        newStarted: getActualMembersWithDetails('newStarted', selectedWeekIndex),
        switching: getActualMembersWithDetails('switching', selectedWeekIndex),
        projectEnded: getActualMembersWithDetails('projectEnded', selectedWeekIndex),
        contractEnded: getActualMembersWithDetails('contractEnded', selectedWeekIndex),
        counselingStarted: getActualMembersWithDetails('counselingStarted', selectedWeekIndex)
      };

      setDetailedMemberData(memberDetails);
      console.log('🔍 [DEBUG] メンバー詳細取得完了（最適化済み）:', memberDetails);
    };

    // コンポーネントマウント時に詳細データを取得
    useEffect(() => {
      loadDetailedMemberData();
    }, [weekKey]);

    const memberDetails = detailedMemberData;

    // データ取得中の場合
    if (isLoadingDetails || !memberDetails) {
      return (
        <div className="mt-4 space-y-4">
          <h3 className="text-base font-semibold">主要項目詳細（詳細データ取得中...）</h3>
          <div className="text-center py-8 text-gray-500">
            メンバー詳細データを読み込み中...
          </div>
        </div>
      );
    }

    // 日付をYYYY/M/D形式でフォーマットする関数
    const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return '-';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}/${month}/${day}`;
      } catch (error) {
        return '-';
      }
    };

    // メンバー詳細をシンプルなテキスト形式で表示する関数
    const renderMemberDetailsText = (members: MemberDetail[], type: string) => {
      if (members.length === 0) {
        return <div className="text-gray-500 text-sm pl-4">対象メンバーなし</div>;
      }

      return (
        <div className="space-y-2 pl-4">
          {members.map((member, index) => {
            // 指標に応じた日付を取得
            let displayDate = '';
            switch (type) {
              case 'newStarted':
              case 'switching':
                displayDate = formatDate(member.lastWorkStartDate);
                break;
              case 'projectEnded':
                displayDate = formatDate(member.lastWorkEndDate);
                break;
              case 'contractEnded':
                displayDate = formatDate(member.contractEndDate);
                break;
              case 'counselingStarted':
                displayDate = formatDate(member.firstCounselingDate);
                break;
              default:
                displayDate = '-';
            }

            return (
              <div key={`${type}-${index}`} className="flex items-center text-sm">
                <div className="flex items-center space-x-2 min-w-[200px]">
                  <span className="text-gray-600">▸</span>
                  <span className="font-medium">{member.name}</span>
                  <span className="text-gray-500 text-xs">({displayDate})</span>
                </div>
                <div className="text-gray-600 min-w-[100px] text-xs">{member.projectName || ''}</div>
                <div className="text-xs text-gray-500 flex-1">
                  {member.reason ? `理由: ${member.reason}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div className="mt-4 space-y-4">
        <h3 className="text-base font-semibold">主要項目詳細（高速表示・キャッシュ機能）</h3>
        
        <div className="space-y-6">
          {/* 新規開始人数 */}
          {selectedWeekDetail.newStarted > 0 && (
            <div>
              <div className="bg-blue-50 p-3 rounded-t-lg border border-blue-200">
                <h4 className="font-medium text-blue-800">
                  新規開始人数 ({selectedWeekDetail.newStarted}人)
                </h4>
              </div>
              <div className="border border-t-0 border-blue-200 p-3 rounded-b-lg bg-white">
                {renderMemberDetailsText(memberDetails.newStarted, 'newStarted')}
              </div>
            </div>
          )}

          {/* 切替完了人数 */}
          {selectedWeekDetail.switching > 0 && (
            <div>
              <div className="bg-green-50 p-3 rounded-t-lg border border-green-200">
                <h4 className="font-medium text-green-800">
                  切替完了人数 ({selectedWeekDetail.switching}人)
                </h4>
              </div>
              <div className="border border-t-0 border-green-200 p-3 rounded-b-lg bg-white">
                {renderMemberDetailsText(memberDetails.switching, 'switching')}
              </div>
            </div>
          )}

          {/* 案件終了人数 */}
          {selectedWeekDetail.projectEnded > 0 && (
            <div>
              <div className="bg-orange-50 p-3 rounded-t-lg border border-orange-200">
                <h4 className="font-medium text-orange-800">
                  案件終了人数 ({selectedWeekDetail.projectEnded}人)
                </h4>
              </div>
              <div className="border border-t-0 border-orange-200 p-3 rounded-b-lg bg-white">
                {renderMemberDetailsText(memberDetails.projectEnded, 'projectEnded')}
              </div>
            </div>
          )}

          {/* 契約終了人数 */}
          {selectedWeekDetail.contractEnded > 0 && (
            <div>
              <div className="bg-red-50 p-3 rounded-t-lg border border-red-200">
                <h4 className="font-medium text-red-800">
                  契約終了人数 ({selectedWeekDetail.contractEnded}人)
                </h4>
              </div>
              <div className="border border-t-0 border-red-200 p-3 rounded-b-lg bg-white">
                {renderMemberDetailsText(memberDetails.contractEnded, 'contractEnded')}
              </div>
            </div>
          )}

          {/* カウンセリング開始人数 */}
          {selectedWeekDetail.counselingStarted > 0 && (
            <div>
              <div className="bg-purple-50 p-3 rounded-t-lg border border-purple-200">
                <h4 className="font-medium text-purple-800">
                  カウンセリング開始人数 ({selectedWeekDetail.counselingStarted}人)
                </h4>
              </div>
              <div className="border border-t-0 border-purple-200 p-3 rounded-b-lg bg-white">
                {renderMemberDetailsText(memberDetails.counselingStarted || [], 'counselingStarted')}
              </div>
            </div>
          )}

          {/* 全項目が0の場合 */}
          {selectedWeekDetail.newStarted === 0 && 
           selectedWeekDetail.switching === 0 && 
           selectedWeekDetail.projectEnded === 0 && 
           selectedWeekDetail.contractEnded === 0 && (
            <div className="text-center py-8 text-gray-500">
              該当するメンバーがいません
            </div>
          )}
        </div>
      </div>
    );
  };

  // 将来見込みメンバー詳細を表示するコンポーネント
  const FutureItemDetails = () => {
    // APIデータから動的に月ラベルを生成
    const months = futureProjectionData.map(data => `${data.year}年${data.month}月`);
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base font-semibold">主要項目詳細</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading && (
            <div className="text-center py-4">
              <div className="text-gray-500">データを読み込み中...</div>
            </div>
          )}
          
          {error && (
            <div className="text-center py-4">
              <div className="text-red-500">{error}</div>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-2"
                variant="outline"
                size="sm"
              >
                再読み込み
              </Button>
            </div>
          )}
          
          {!loading && !error && adjustedFutureProjectionData.map((data, monthIndex) => {
            const month = months[monthIndex];
            if (!month) return null;
            
            return (
              <div key={month}>
                <FutureMemberDetailsList
                  monthLabel={month}
                  newStartingMembers={data?.newStarting?.members?.map(member => ({
                    id: member.id,
                    name: member.name,
                    status: member.status,
                    confidence: memberConfidence[member.id] || member.confidence,
                    startDate: member.startDate,
                    adjustedStartMonth: memberMonthAdjustments[member.id]
                  })) || []}
                  switchingMembers={data?.switching?.members?.map(member => ({
                    id: member.id,
                    name: member.name,
                    status: member.status,
                    confidence: memberConfidence[member.id] || member.confidence,
                    endDate: member.endDate,
                    adjustedStartMonth: memberMonthAdjustments[member.id]
                  })) || []}
                  projectEndingMembers={data?.projectEnding?.members?.map(member => ({
                    id: member.id,
                    name: member.name,
                    status: member.status,
                    confidence: memberConfidence[member.id] || member.confidence,
                    endDate: member.endDate,
                    reason: member.reason
                  })) || []}
                  contractEndingMembers={data?.contractEnding?.members?.map(member => ({
                    id: member.id,
                    name: member.name,
                    status: member.status,
                    confidence: memberConfidence[member.id] || member.confidence,
                    endDate: member.endDate,
                    reason: member.reason
                  })) || []}
                  onConfidenceChange={updateMemberConfidence}
                  onMonthChange={updateMemberMonth}
                  availableMonths={getAvailableMonths()}
                  currentMonth={data.month}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  // 将来見込みの合計値計算（調整済みデータベース）
  const calculateFutureTotals = (monthIndex: number) => {
    if (!adjustedFutureProjectionData[monthIndex]) {
      return {
        totalStarting: 0,
        totalEnding: 0,
        totalWorkers: 0
      };
    }

    const data = adjustedFutureProjectionData[monthIndex];
    if (!data || !data.newStarting || !data.switching || !data.projectEnding || !data.contractEnding) {
      return {
        totalStarting: 0,
        totalEnding: 0,
        totalWorkers: 0
      };
    }

    return {
      totalStarting: (data.newStarting.count || 0) + (data.switching.count || 0),
      totalEnding: (data.projectEnding.count || 0) + (data.contractEnding.count || 0),
      totalWorkers: data.totalProjected || 0
    };
  };

  // 利用可能な月のオプションを生成
  const getAvailableMonths = () => {
    const months = [];
    
    // 現在月から3ヶ月分を生成
    for (let i = 0; i < 3; i++) {
      const targetMonth = selectedMonth + i;
      const targetYear = targetMonth > 12 ? selectedYear + 1 : selectedYear;
      const adjustedMonth = targetMonth > 12 ? targetMonth - 12 : targetMonth;
      
      months.push({
        value: adjustedMonth,
        label: `${targetYear}年${adjustedMonth}月`
      });
    }
    
    return months;
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">現在の稼働状況</TabsTrigger>
          <TabsTrigger value="future">稼働者将来見込み</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {/* 稼働状況詳細テーブル */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-purple-700">稼働状況詳細</CardTitle>
              <div className="text-sm text-gray-600">
                選択期間における実績ベースの稼働状況を表示
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-purple-100">
                      <th className="border border-gray-300 p-2 text-left w-48 font-bold text-purple-800">項目</th>
                      {weekLabels.map((week, index) => (
                        <th 
                          key={index} 
                          className={`border border-gray-300 p-2 text-center w-24 font-bold ${
                            week.isTarget ? 'bg-purple-200 text-purple-900' : 
                            week.isPrediction ? 'bg-gray-100 text-gray-700' : 'text-purple-800'
                          }`}
                        >
                          {week.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-2 font-medium">
                        <div className="flex items-center gap-2">
                          <span>総稼働者数</span>
                          <SimpleTooltip 
                            definition={metricDefinitions.totalWorkers.definition}
                            method={metricDefinitions.totalWorkers.method}
                          />
                        </div>
                      </td>
                      {weeklyMetrics.map((week: any, index: number) => (
                        <td key={index} className="border border-gray-300 p-2 text-center">
                          {week.totalWorkers}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-medium">
                        <div className="flex items-center gap-2">
                          <span>総開始人数</span>
                          <SimpleTooltip 
                            definition="その週に新たに稼働を開始したメンバー総数"
                            method="新規開始人数 + 切替完了人数"
                          />
                        </div>
                      </td>
                      {weeklyMetrics.map((week: any, index: number) => (
                        <td key={index} className="border border-gray-300 p-2 text-center">
                          {week.newStarted + week.switching}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-6">
                        <div className="flex items-center gap-2">
                          <span>新規開始人数</span>
                          <SimpleTooltip 
                            definition={metricDefinitions.newStarted.definition}
                            method={metricDefinitions.newStarted.method}
                          />
                        </div>
                      </td>
                      {weeklyMetrics.map((week: any, index: number) => (
                        <td key={index} className="border border-gray-300 p-2 text-center">
                          <CellWithClick 
                            cellId={`newStarted-${index}`} 
                            value={week.newStarted} 
                            type="newStarted"
                            weekIndex={index}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-6">
                        <div className="flex items-center gap-2">
                          <span>切替完了人数</span>
                          <SimpleTooltip 
                            definition={metricDefinitions.switching.definition}
                            method={metricDefinitions.switching.method}
                          />
                        </div>
                      </td>
                      {weeklyMetrics.map((week: any, index: number) => (
                        <td key={index} className="border border-gray-300 p-2 text-center">
                          <CellWithClick 
                            cellId={`switching-${index}`} 
                            value={week.switching} 
                            type="switching"
                            weekIndex={index}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-medium">
                        <div className="flex items-center gap-2">
                          <span>総終了人数</span>
                          <SimpleTooltip 
                            definition="その週に稼働を終了したメンバー総数"
                            method="案件終了人数 + 契約終了人数"
                          />
                        </div>
                      </td>
                      {weeklyMetrics.map((week: any, index: number) => (
                        <td key={index} className="border border-gray-300 p-2 text-center">
                          {week.projectEnded + week.contractEnded}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-6">
                        <div className="flex items-center gap-2">
                          <span>案件終了人数</span>
                          <SimpleTooltip 
                            definition={metricDefinitions.projectEnded.definition}
                            method={metricDefinitions.projectEnded.method}
                          />
                        </div>
                      </td>
                      {weeklyMetrics.map((week: any, index: number) => (
                        <td key={index} className="border border-gray-300 p-2 text-center">
                          <CellWithClick 
                            cellId={`projectEnded-${index}`} 
                            value={week.projectEnded} 
                            type="projectEnded"
                            weekIndex={index}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-6">
                        <div className="flex items-center gap-2">
                          <span>契約終了人数</span>
                          <SimpleTooltip 
                            definition={metricDefinitions.contractEnded.definition}
                            method={metricDefinitions.contractEnded.method}
                          />
                        </div>
                      </td>
                      {weeklyMetrics.map((week: any, index: number) => (
                        <td key={index} className="border border-gray-300 p-2 text-center">
                          <CellWithClick 
                            cellId={`contractEnded-${index}`} 
                            value={week.contractEnded} 
                            type="contractEnded"
                            weekIndex={index}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-medium text-gray-600">※その他人員推移</td>
                      <td className="border border-gray-300 p-2 text-center text-gray-400">-</td>
                      <td className="border border-gray-300 p-2 text-center text-gray-400">-</td>
                      <td className="border border-gray-300 p-2 text-center text-gray-400">-</td>
                      <td className="border border-gray-300 p-2 text-center text-gray-400">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-6">
                        <div className="flex items-center gap-2">
                          <span>カウンセリング開始人数</span>
                          <SimpleTooltip 
                            definition={metricDefinitions.counselingStarted.definition}
                            method={metricDefinitions.counselingStarted.method}
                          />
                        </div>
                      </td>
                      {weeklyMetrics.map((week: any, index: number) => (
                        <td key={index} className="border border-gray-300 p-2 text-center">
                          <CellWithClick 
                            cellId={`counselingStarted-${index}`} 
                            value={week.counselingStarted} 
                            type="counselingStarted"
                            weekIndex={index}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-6">
                        <div className="flex items-center gap-2">
                          <span>その他離脱人数</span>
                          <SimpleTooltip 
                            definition={metricDefinitions.otherLeft.definition}
                            method={metricDefinitions.otherLeft.method}
                          />
                        </div>
                      </td>
                      {weeklyMetrics.map((week: any, index: number) => (
                        <td key={index} className="border border-gray-300 p-2 text-center">
                          <CellWithClick 
                            cellId={`otherLeft-${index}`} 
                            value={week.otherLeft} 
                            type="otherLeft"
                            weekIndex={index}
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>


          {/* 現在の稼働状況メンバー詳細 */}
          <CurrentItemDetails />
        </TabsContent>

        <TabsContent value="future" className="space-y-4">
          {/* 将来見込みテーブル */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-purple-800">3.稼働者将来見込み</CardTitle>
              <div className="text-sm text-gray-600">
                実データに基づく将来見込み（自動算出）
              </div>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="text-center py-8">
                  <div className="text-gray-500">データを読み込み中...</div>
                </div>
              )}
              
              {error && (
                <div className="text-center py-8">
                  <div className="text-red-500 mb-4">{error}</div>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline"
                  >
                    再読み込み
                  </Button>
                </div>
              )}
              
              {!loading && !error && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-purple-100">
                        <th className="border border-gray-300 p-2 text-left w-48 font-bold text-purple-800">項目</th>
                        {futureProjectionData.map((data, index) => (
                          <th key={index} className="border border-gray-300 p-2 text-center w-24 font-bold text-purple-800">
                            {data.year}年{data.month}月
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">
                          <div className="flex items-center gap-2">
                            <span>見込総数稼働者数</span>
                            <SimpleTooltip 
                              definition={futureMetricDefinitions.totalProjected.definition}
                              method={futureMetricDefinitions.totalProjected.method}
                            />
                          </div>
                        </td>
                        {[0, 1, 2].map((index) => (
                          <td key={index} className="border border-gray-300 p-2 text-center">
                            {calculateFutureTotals(index).totalWorkers}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">
                          <div className="flex items-center gap-2">
                            <span>総開始見込み人数</span>
                            <SimpleTooltip 
                              definition={futureMetricDefinitions.totalStarting.definition}
                              method={futureMetricDefinitions.totalStarting.method}
                            />
                          </div>
                        </td>
                        {[0, 1, 2].map((index) => (
                          <td key={index} className="border border-gray-300 p-2 text-center">
                            {calculateFutureTotals(index).totalStarting}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 pl-6">
                          <div className="flex items-center gap-2">
                            <span>新規開始人数</span>
                            <SimpleTooltip 
                              definition={futureMetricDefinitions.newStarting.definition}
                              method={futureMetricDefinitions.newStarting.method}
                            />
                          </div>
                        </td>
                        {adjustedFutureProjectionData.map((data, index) => (
                          <td key={index} className="border border-gray-300 p-2 text-center">
                            <span className="text-orange-500">●</span>
                            <span className="font-medium text-gray-900 ml-1">{data?.newStarting?.count || 0}</span>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 pl-6">
                          <div className="flex items-center gap-2">
                            <span>切替完了人数</span>
                            <SimpleTooltip 
                              definition={futureMetricDefinitions.switchingCompleted.definition}
                              method={futureMetricDefinitions.switchingCompleted.method}
                            />
                          </div>
                        </td>
                        {adjustedFutureProjectionData.map((data, index) => (
                          <td key={index} className="border border-gray-300 p-2 text-center">
                            <span className="text-orange-500">●</span>
                            <span className="font-medium text-gray-900 ml-1">{data?.switching?.count || 0}</span>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">
                          <div className="flex items-center gap-2">
                            <span>総終了見込み人数</span>
                            <SimpleTooltip 
                              definition={futureMetricDefinitions.totalEnding.definition}
                              method={futureMetricDefinitions.totalEnding.method}
                            />
                          </div>
                        </td>
                        {[0, 1, 2].map((index) => (
                          <td key={index} className="border border-gray-300 p-2 text-center">
                            {calculateFutureTotals(index).totalEnding}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 pl-6">
                          <div className="flex items-center gap-2">
                            <span>案件終了人数</span>
                            <SimpleTooltip 
                              definition={futureMetricDefinitions.projectEnding.definition}
                              method={futureMetricDefinitions.projectEnding.method}
                            />
                          </div>
                        </td>
                        {adjustedFutureProjectionData.map((data, index) => (
                          <td key={index} className="border border-gray-300 p-2 text-center">
                            <span className="text-orange-500">●</span>
                            <span className="font-medium text-gray-900 ml-1">{data?.projectEnding?.count || 0}</span>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 pl-6">
                          <div className="flex items-center gap-2">
                            <span>契約終了人数</span>
                            <SimpleTooltip 
                              definition={futureMetricDefinitions.contractEnding.definition}
                              method={futureMetricDefinitions.contractEnding.method}
                            />
                          </div>
                        </td>
                        {adjustedFutureProjectionData.map((data, index) => (
                          <td key={index} className="border border-gray-300 p-2 text-center">
                            <span className="text-orange-500">●</span>
                            <span className="font-medium text-gray-900 ml-1">{data?.contractEnding?.count || 0}</span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 将来見込みメンバー詳細 */}
          <FutureItemDetails />
        </TabsContent>
      </Tabs>

      {/* メンバー詳細ダイアログ */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              対象メンバーの詳細情報
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMembers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left">名前</th>
                      <th className="border border-gray-300 p-2 text-left">最新案件開始日</th>
                      <th className="border border-gray-300 p-2 text-left">最新案件終了日</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="border border-gray-300 p-2">{member.name}</td>
                        <td className="border border-gray-300 p-2">
                          {member.startDate 
                            ? format(member.startDate, 'yyyy/MM/dd', { locale: ja })
                            : '-'}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {member.endDate 
                            ? format(member.endDate, 'yyyy/MM/dd', { locale: ja })
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                対象メンバーがいません
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 