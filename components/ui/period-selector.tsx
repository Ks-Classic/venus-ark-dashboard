"use client"

import { useMemo, useState, useEffect } from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { getWeeksInMonth, getYearWeekNumber, getWeekNumberFromDate, getWeekDateRange, getValidWeeksInMonth } from "@/lib/date"

export interface PeriodSelection {
  year: number;
  month: number;
  weekInMonth: number;
  actualWeekNumber: number;
}

interface PeriodSelectorProps {
  selectedYear: number;
  selectedMonth: number;
  selectedWeekInMonth: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onWeekChange: (week: number) => void;
  className?: string;
}

export function PeriodSelector({
  selectedYear,
  selectedMonth,
  selectedWeekInMonth,
  onYearChange,
  onMonthChange,
  onWeekChange,
  className = ""
}: PeriodSelectorProps) {
  
  // 月またぎの週をスキップした有効な週リストを取得
  const validWeeksInSelectedMonth = useMemo(() => {
    return getValidWeeksInMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const { start, end } = useMemo(() => {
    return getWeekDateRange(selectedYear, selectedMonth, selectedWeekInMonth);
  }, [selectedYear, selectedMonth, selectedWeekInMonth]);

  // デバッグ情報をコンソールに出力
  console.log('[PeriodSelector Debug]', {
    selectedYear,
    selectedMonth,
    selectedWeekInMonth,
    validWeeksInSelectedMonth,
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  });

  const handleYearChange = (year: number) => {
    onYearChange(year);
  };

  const handleMonthChange = (month: number) => {
    onMonthChange(month);
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-sm font-medium text-gray-700">期間選択:</h3>
          
          <div className="flex items-center space-x-2">
            <label htmlFor="year-select" className="text-sm font-medium">年:</label>
            <Input
              id="year-select"
              type="number"
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
              className="w-20"
              min="2020"
              max="2030"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="month-select" className="text-sm font-medium">月:</label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}月
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="week-select" className="text-sm font-medium">週:</label>
            <select
              id="week-select"
              value={selectedWeekInMonth}
              onChange={(e) => onWeekChange(parseInt(e.target.value, 10))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {validWeeksInSelectedMonth.length > 0 ? (
                validWeeksInSelectedMonth.map((week) => (
                  <option key={week} value={week}>
                    {week}週目
                  </option>
                ))
              ) : (
                <option value={1}>1週目</option>
              )}
            </select>
          </div>

          <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-md">
            対象範囲: {format(start, "yyyy年M月d日(E)", { locale: ja })} ~ {format(end, "M月d日(E)", { locale: ja })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 期間選択のカスタムフック（最終修正版）
export function usePeriodSelection(initialYear?: number, initialMonth?: number, initialWeek?: number) {
  const now = new Date();
  const currentWeekInfo = getWeekNumberFromDate(now);
  
  // 初期値を設定
  const initialYearValue = initialYear || currentWeekInfo.year;
  const initialMonthValue = initialMonth || currentWeekInfo.month;
  const initialWeekValue = initialWeek || currentWeekInfo.weekInMonth;
  
  // 初期週の妥当性をチェック
  const initialValidWeeks = getValidWeeksInMonth(initialYearValue, initialMonthValue);
  const validInitialWeek = initialValidWeeks.includes(initialWeekValue) ? initialWeekValue : initialValidWeeks[0] || 1;
  
  const [selectedYear, setSelectedYear] = useState<number>(initialYearValue);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonthValue);
  const [selectedWeekInMonth, setSelectedWeekInMonth] = useState<number>(validInitialWeek);

  // 年または月が変更されたときに、週の選択が妥当かチェックし、必要であれば調整する
  useEffect(() => {
    const validWeeks = getValidWeeksInMonth(selectedYear, selectedMonth);
    if (validWeeks.length === 0) {
      // 有効な週がない場合は、その月の第1週を選択（月を変更しない）
      setSelectedWeekInMonth(1);
    } else if (!validWeeks.includes(selectedWeekInMonth)) {
      // 選択された週が有効でない場合は、最初の有効な週を選択
      setSelectedWeekInMonth(validWeeks[0]);
    }
  }, [selectedYear, selectedMonth]); // selectedWeekInMonthを依存配列から削除

  const actualWeekNumber = useMemo(() => {
    const validWeeks = getValidWeeksInMonth(selectedYear, selectedMonth);
    const validWeek = validWeeks.includes(selectedWeekInMonth) ? selectedWeekInMonth : validWeeks[0];
    // getWeekDateRangeを使用して、選択された週の代表的な日付（開始日）を取得
    const { start: representativeDate } = getWeekDateRange(selectedYear, selectedMonth, validWeek);
    // getYearWeekNumberにDateオブジェクトを渡して、年間週番号を取得
    return getYearWeekNumber(representativeDate).weekInYear;
  }, [selectedYear, selectedMonth, selectedWeekInMonth]);

  const periodSelection: PeriodSelection = {
    year: selectedYear,
    month: selectedMonth,
    weekInMonth: selectedWeekInMonth,
    actualWeekNumber
  };

  return {
    periodSelection,
    selectedYear,
    selectedMonth,
    selectedWeekInMonth,
    actualWeekNumber,
    setSelectedYear,
    setSelectedMonth,
    setSelectedWeekInMonth
  };
}