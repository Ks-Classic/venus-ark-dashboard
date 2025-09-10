'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  UserPlus, 
  ArrowUpDown, 
  UserMinus, 
  Calendar, 
  ChevronDown,
  ChevronUp,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface FutureMember {
  id: string;
  name: string;
  status: string;
  confidence?: 'high' | 'medium' | 'low' | 'unknown';
  startDate?: string;
  endDate?: string;
  reason?: string;
  adjustedStartMonth?: number; // ローカル調整された開始月
}

interface FutureMemberDetailsListProps {
  monthLabel: string;
  newStartingMembers: FutureMember[];
  switchingMembers: FutureMember[];
  projectEndingMembers: FutureMember[];
  contractEndingMembers: FutureMember[];
  onConfidenceChange?: (memberId: string, confidence: 'high' | 'medium' | 'low' | 'unknown') => void;
  onMonthChange?: (memberId: string, newMonth: number) => void;
  availableMonths?: { value: number; label: string }[];
  currentMonth?: number;
}

export function FutureMemberDetailsList({
  monthLabel,
  newStartingMembers,
  switchingMembers,
  projectEndingMembers,
  contractEndingMembers,
  onConfidenceChange,
  onMonthChange,
  availableMonths,
  currentMonth
}: FutureMemberDetailsListProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    newStarting: true,
    switching: false,
    projectEnding: false,
    contractEnding: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未定';
    try {
      const date = new Date(dateString);
      return format(date, 'M/d', { locale: ja });
    } catch {
      return dateString;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'working': return '稼動';
      case 'learning_started': return '初回カウンセリング';
      case 'recruiting': return '採用活動中';
      case 'training': return '研修中';
      case 'contract_ended': return '契約終了';
      case 'project_released': return '終了';
      case 'job_matching': return '案件斡旋';
      case 'interview_prep': return '面接対策';
      case 'interview': return '面接';
      case 'result_waiting': return '結果待ち';
      case 'hired': return '採用';
      case 'inactive': return '非アクティブ';
      default: return status;
    }
  };

  const getConfidenceLabel = (confidence?: string) => {
    switch (confidence) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      case 'unknown': return '未設定';
      default: return '未設定';
    }
  };

  const getConfidenceBadgeVariant = (confidence?: string) => {
    switch (confidence) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      case 'unknown': return 'outline';
      default: return 'outline';
    }
  };

  const MemberTable = ({ members, type }: { members: FutureMember[], type: string }) => {
    if (members.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          該当するメンバーはいません
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>氏名</TableHead>
            <TableHead>ステータス</TableHead>
            {(type === 'projectEnding' || type === 'contractEnding') && <TableHead>終了予定日</TableHead>}
            {(type === 'projectEnding' || type === 'contractEnding') && <TableHead>理由</TableHead>}
            {(type === 'newStarting' || type === 'switching') && onMonthChange && availableMonths && <TableHead>予定開始月</TableHead>}
            <TableHead>確度</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{getStatusLabel(member.status)}</Badge>
              </TableCell>

              {(type === 'projectEnding' || type === 'contractEnding') && (
                <TableCell>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(member.endDate)}
                  </div>
                </TableCell>
              )}
              {(type === 'projectEnding' || type === 'contractEnding') && (
                <TableCell>
                  <span className="text-sm text-gray-600">
                    {member.reason || '理由未記載'}
                  </span>
                </TableCell>
              )}
              {(type === 'newStarting' || type === 'switching') && onMonthChange && availableMonths && (
                <TableCell>
                  <Select 
                    value={member.adjustedStartMonth?.toString() || currentMonth?.toString() || ''} 
                    onValueChange={(value) => onMonthChange(member.id, parseInt(value))}
                  >
                    <SelectTrigger className="w-32 h-8 text-sm">
                      <SelectValue placeholder="月を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
              <TableCell>
                {onConfidenceChange ? (
                  <Select 
                    value={member.confidence || 'medium'} 
                    onValueChange={(value) => onConfidenceChange(member.id, value as 'high' | 'medium' | 'low' | 'unknown')}
                  >
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="low">低</SelectItem>
                      <SelectItem value="unknown">未設定</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={getConfidenceBadgeVariant(member.confidence)}>
                    {getConfidenceLabel(member.confidence)}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const sections = [
    {
      key: 'newStarting',
      title: '新規開始見込み',
      icon: UserPlus,
      count: newStartingMembers.length,
      members: newStartingMembers,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      key: 'switching',
      title: '切替完了見込み',
      icon: ArrowUpDown,
      count: switchingMembers.length,
      members: switchingMembers,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      key: 'projectEnding',
      title: '案件終了見込み',
      icon: UserMinus,
      count: projectEndingMembers.length,
      members: projectEndingMembers,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      key: 'contractEnding',
      title: '契約終了見込み',
      icon: UserMinus,
      count: contractEndingMembers.length,
      members: contractEndingMembers,
      color: 'text-red-700',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-purple-700">{monthLabel}の詳細</h3>
      </div>
      
      {sections.map((section) => {
        const Icon = section.icon;
        const isExpanded = expandedSections[section.key];
        
        return (
          <Card key={section.key}>
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection(section.key)}
            >
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${section.bgColor}`}>
                    <Icon className={`h-4 w-4 ${section.color}`} />
                  </div>
                  <span>{section.title}</span>
                  <Badge variant="secondary">{section.count}名</Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CardTitle>
            </CardHeader>
            {isExpanded && (
              <CardContent>
                <MemberTable members={section.members} type={section.key} />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
} 