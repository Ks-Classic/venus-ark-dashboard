import React from 'react';
import { CellData } from '@/lib/types/recruitment_dashboard';

interface ClickableCellProps {
  value: number | string;
  rowLabel: string;
  weekId: string;
  tableType: 'collection' | 'interview' | 'rejection' | 'rate';
  rowIndex: number;
  colIndex: number;
  onClick: (cellData: CellData) => void;
  className?: string;
}

export const ClickableCell: React.FC<ClickableCellProps> = ({
  value,
  rowLabel,
  weekId,
  tableType,
  rowIndex,
  colIndex,
  onClick,
  className = ''
}) => {
  const handleClick = () => {
    // 文字列の場合は数値に変換（パーセンテージなど）
    const numericValue = typeof value === 'string' ? 
      parseFloat(value.replace('%', '')) || 0 : 
      value;

    onClick({
      value: numericValue,
      rowLabel,
      weekId,
      tableType,
      coordinates: { row: rowIndex, col: colIndex }
    });
  };

  return (
    <td 
      className={`border border-gray-300 px-4 py-2 text-center clickable-cell ${className}`}
      onClick={handleClick}
      title={`${rowLabel} - ${weekId}をクリックして詳細を追加`}
    >
      {value}
    </td>
  );
};

// 通常のセル（クリック不可）
interface RegularCellProps {
  value: number | string;
  className?: string;
}

export const RegularCell: React.FC<RegularCellProps> = ({
  value,
  className = ''
}) => {
  return (
    <td className={`border border-gray-300 px-4 py-2 text-center ${className}`}>
      {value}
    </td>
  );
}; 