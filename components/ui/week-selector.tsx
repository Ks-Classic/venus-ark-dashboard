import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { WeekSelection } from '@/lib/types/recruitment_dashboard';

interface WeekSelectorProps {
  selectedWeeks: string[];
  onWeekChange: (weeks: string[]) => void;
  maxWeeks?: number;
  className?: string;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  selectedWeeks,
  onWeekChange,
  maxWeeks = 4,
  className = ''
}) => {
  const [startWeek, setStartWeek] = useState('');
  const [endWeek, setEndWeek] = useState('');

  useEffect(() => {
    if (selectedWeeks.length > 0) {
      const sortedWeeks = [...selectedWeeks].sort();
      setStartWeek(sortedWeeks[0]);
      setEndWeek(sortedWeeks[sortedWeeks.length - 1]);
    }
  }, [selectedWeeks]);

  // 週IDから年と週番号を取得
  const parseWeekId = (weekId: string): { year: number; week: number } => {
    const match = weekId.match(/(\d{4})-W(\d{1,2})/);
    if (match) {
      return { year: parseInt(match[1]), week: parseInt(match[2]) };
    }
    return { year: 2025, week: 1 };
  };

  // 年と週番号から週IDを生成
  const formatWeekId = (year: number, week: number): string => {
    return `${year}-W${week.toString().padStart(2, '0')}`;
  };

  // 週の範囲を生成
  const generateWeekRange = (start: string, end: string): string[] => {
    const startParsed = parseWeekId(start);
    const endParsed = parseWeekId(end);
    const weeks: string[] = [];

    let currentYear = startParsed.year;
    let currentWeek = startParsed.week;

    while (
      currentYear < endParsed.year || 
      (currentYear === endParsed.year && currentWeek <= endParsed.week)
    ) {
      weeks.push(formatWeekId(currentYear, currentWeek));
      currentWeek++;
      if (currentWeek > 52) {
        currentYear++;
        currentWeek = 1;
      }
    }

    // ユニークかつ昇順、maxWeeks分のみ
    return Array.from(new Set(weeks)).sort().slice(0, maxWeeks);
  };

  // 週の移動
  const moveWeeks = (direction: 'prev' | 'next') => {
    if (selectedWeeks.length === 0) return;

    const sortedWeeks = [...selectedWeeks].sort();
    const firstWeek = parseWeekId(sortedWeeks[0]);
    const lastWeek = parseWeekId(sortedWeeks[sortedWeeks.length - 1]);

    let newFirstWeek: { year: number; week: number };
    let newLastWeek: { year: number; week: number };

    if (direction === 'prev') {
      newFirstWeek = { ...firstWeek };
      newFirstWeek.week--;
      if (newFirstWeek.week < 1) {
        newFirstWeek.year--;
        newFirstWeek.week = 52;
      }
      
      newLastWeek = { ...lastWeek };
      newLastWeek.week--;
      if (newLastWeek.week < 1) {
        newLastWeek.year--;
        newLastWeek.week = 52;
      }
    } else {
      newFirstWeek = { ...firstWeek };
      newFirstWeek.week++;
      if (newFirstWeek.week > 52) {
        newFirstWeek.year++;
        newFirstWeek.week = 1;
      }
      
      newLastWeek = { ...lastWeek };
      newLastWeek.week++;
      if (newLastWeek.week > 52) {
        newLastWeek.year++;
        newLastWeek.week = 1;
      }
    }

    const newWeeks = generateWeekRange(
      formatWeekId(newFirstWeek.year, newFirstWeek.week),
      formatWeekId(newLastWeek.year, newLastWeek.week)
    );

    // ユニークかつ昇順、maxWeeks分のみ
    onWeekChange(Array.from(new Set(newWeeks)).sort().slice(0, maxWeeks));
  };

  // 週範囲の適用
  const applyWeekRange = () => {
    if (startWeek && endWeek) {
      const weeks = generateWeekRange(startWeek, endWeek);
      onWeekChange(Array.from(new Set(weeks)).sort().slice(0, maxWeeks));
    }
  };

  // 現在の週を取得
  const getCurrentWeek = (): string => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((now.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
    return formatWeekId(now.getFullYear(), weekNumber);
  };

  // 今週を基準にした4週間を設定
  const setCurrentWeeks = () => {
    const currentWeek = getCurrentWeek();
    const parsed = parseWeekId(currentWeek);
    const weeks: string[] = [];
    
    for (let i = 0; i < maxWeeks; i++) {
      let weekNum = parsed.week - (maxWeeks - 1 - i);
      let year = parsed.year;
      
      if (weekNum < 1) {
        year--;
        weekNum += 52;
      }
      
      weeks.push(formatWeekId(year, weekNum));
    }
    
    onWeekChange(Array.from(new Set(weeks)).sort().slice(0, maxWeeks));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <Label className="text-sm font-medium">週選択</Label>
      </div>
      
      {/* 週移動ボタン */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => moveWeeks('prev')}
          disabled={selectedWeeks.length === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          前の週
        </Button>
        
        <div className="flex-1 text-center">
          <div className="text-sm text-gray-600">
            {selectedWeeks.length > 0 ? (
              `${selectedWeeks[0]} 〜 ${selectedWeeks[selectedWeeks.length - 1]}`
            ) : (
              '週を選択してください'
            )}
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => moveWeeks('next')}
          disabled={selectedWeeks.length === 0}
        >
          次の週
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 手動入力 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start-week" className="text-xs">開始週</Label>
          <Input
            id="start-week"
            value={startWeek}
            onChange={(e) => setStartWeek(e.target.value)}
            placeholder="2025-W25"
            className="text-sm"
          />
        </div>
        <div>
          <Label htmlFor="end-week" className="text-xs">終了週</Label>
          <Input
            id="end-week"
            value={endWeek}
            onChange={(e) => setEndWeek(e.target.value)}
            placeholder="2025-W28"
            className="text-sm"
          />
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={applyWeekRange}
          disabled={!startWeek || !endWeek}
        >
          適用
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={setCurrentWeeks}
        >
          今週を基準
        </Button>
      </div>

      {/* 選択された週の表示 */}
      {selectedWeeks.length > 0 && (
        <div className="text-xs text-gray-500">
          選択中: {selectedWeeks.join(', ')}
        </div>
      )}
    </div>
  );
}; 