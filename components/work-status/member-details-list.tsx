'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  MapPin, 
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { WorkStatusDetail } from '@/lib/types/work_status_report';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface MemberDetailsListProps {
  newWorkMembers: WorkStatusDetail[];
  switchingMembers: WorkStatusDetail[];
  projectReleasedMembers: WorkStatusDetail[];
  contractTerminatedMembers: WorkStatusDetail[];
}

export function MemberDetailsList({
  newWorkMembers,
  switchingMembers,
  projectReleasedMembers,
  contractTerminatedMembers
}: MemberDetailsListProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    newWork: true,
    switching: false,
    projectRelease: false,
    contractTermination: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (date: Date) => {
    return format(date, 'M/d', { locale: ja });
  };

  const formatDuration = (days: number) => {
    if (days < 30) return `${days}日`;
    if (days < 365) return `${Math.floor(days / 30)}ヶ月`;
    return `${Math.floor(days / 365)}年${Math.floor((days % 365) / 30)}ヶ月`;
  };

  const MemberTable = ({ members, type }: { members: WorkStatusDetail[], type: string }) => {
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
            <TableHead>職種</TableHead>
            <TableHead>案件名</TableHead>
            <TableHead>変更日</TableHead>
            <TableHead>最寄り駅</TableHead>
            <TableHead>稼働期間</TableHead>
            {type === 'switching' && <TableHead>前案件</TableHead>}
            {(type === 'projectRelease' || type === 'contractTermination') && <TableHead>理由</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member, index) => (
            <TableRow key={`${member.memberId}-${index}`}>
              <TableCell className="font-medium">{member.memberName}</TableCell>
              <TableCell>
                <Badge variant="outline">{member.jobCategory}</Badge>
              </TableCell>
              <TableCell>{member.projectName}</TableCell>
              <TableCell>{formatDate(member.statusChangeDate)}</TableCell>
              <TableCell>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-3 w-3 mr-1" />
                  {member.nearestStation || '未設定'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center text-sm">
                  <Clock className="h-3 w-3 mr-1" />
                  {member.workDuration ? formatDuration(member.workDuration) : '-'}
                </div>
              </TableCell>
              {type === 'switching' && (
                <TableCell>
                  <span className="text-sm text-gray-600">
                    {(member as any).previousProjectName || '不明'}
                  </span>
                </TableCell>
              )}
              {(type === 'projectRelease' || type === 'contractTermination') && (
                <TableCell>
                  <span className="text-sm text-gray-600">
                    {(member as any).reason || '理由未記載'}
                  </span>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const sections = [
    {
      key: 'newWork',
      title: '新規稼働',
      icon: UserPlus,
      count: newWorkMembers.length,
      members: newWorkMembers,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      key: 'switching',
      title: '案件切り替え',
      icon: ArrowUpDown,
      count: switchingMembers.length,
      members: switchingMembers,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      key: 'projectRelease',
      title: '案件解除',
      icon: UserMinus,
      count: projectReleasedMembers.length,
      members: projectReleasedMembers,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      key: 'contractTermination',
      title: '契約解除',
      icon: UserMinus,
      count: contractTerminatedMembers.length,
      members: contractTerminatedMembers,
      color: 'text-red-700',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="space-y-4">
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