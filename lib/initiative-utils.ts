import { 
  InitiativeVersion, 
  VersionDiff, 
  VersionComparison,
  InitiativeStatus,
  InitiativeCategory,
  Priority 
} from '@/lib/types/initiative';

/**
 * 2つのバージョン間の差分を計算
 */
export function compareVersions(
  fromVersion: InitiativeVersion, 
  toVersion: InitiativeVersion
): VersionComparison {
  const differences: VersionDiff[] = [];

  // 比較対象フィールドの定義
  const fieldsToCompare = [
    { key: 'issue', label: '課題' },
    { key: 'cause', label: '原因' },
    { key: 'action', label: 'アクション' },
    { key: 'result', label: '結果' },
    { key: 'status', label: 'ステータス' },
    { key: 'priority', label: '優先度' },
    { key: 'assignee', label: '担当者' },
    { key: 'dueDate', label: '期限' }
  ];

  fieldsToCompare.forEach(({ key, label }) => {
    const oldValue = getFieldValue(fromVersion, key);
    const newValue = getFieldValue(toVersion, key);

    if (oldValue !== newValue) {
      let changeType: 'added' | 'modified' | 'removed' = 'modified';
      
      if (!oldValue && newValue) changeType = 'added';
      else if (oldValue && !newValue) changeType = 'removed';

      differences.push({
        field: key,
        fieldLabel: label,
        oldValue: oldValue || '（未設定）',
        newValue: newValue || '（未設定）',
        changeType
      });
    }
  });

  return {
    fromVersion,
    toVersion,
    differences
  };
}

/**
 * フィールド値を取得（型安全）
 */
function getFieldValue(version: InitiativeVersion, field: string): string {
  const value = (version as any)[field];
  
  if (field === 'dueDate' && value) {
    return value instanceof Date ? value.toISOString().split('T')[0] : value;
  }
  
  return value ? String(value) : '';
}

/**
 * ステータスの表示用アイコンとスタイルを取得
 */
export function getStatusDisplay(status: InitiativeStatus) {
  const statusConfig = {
    [InitiativeStatus.PLANNED]: { 
      icon: '🕐', 
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      bgColor: 'bg-gray-50'
    },
    [InitiativeStatus.IN_PROGRESS]: { 
      icon: '⚙️', 
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      bgColor: 'bg-blue-50'
    },
    [InitiativeStatus.COMPLETED]: { 
      icon: '✅', 
      color: 'bg-green-100 text-green-800 border-green-300',
      bgColor: 'bg-green-50'
    },
    [InitiativeStatus.ON_HOLD]: { 
      icon: '⏸️', 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      bgColor: 'bg-yellow-50'
    },
    [InitiativeStatus.CANCELLED]: { 
      icon: '❌', 
      color: 'bg-red-100 text-red-800 border-red-300',
      bgColor: 'bg-red-50'
    }
  };

  return statusConfig[status] || statusConfig[InitiativeStatus.PLANNED];
}

/**
 * カテゴリの表示用アイコンとスタイルを取得
 */
export function getCategoryDisplay(category: InitiativeCategory) {
  const categoryConfig = {
    [InitiativeCategory.RECRUITMENT]: { 
      icon: '🎯', 
      color: 'bg-purple-100 text-purple-800 border-purple-300' 
    },
    [InitiativeCategory.STAFFING]: { 
      icon: '👥', 
      color: 'bg-blue-100 text-blue-800 border-blue-300' 
    },
    [InitiativeCategory.SYSTEM_IMPROVEMENT]: { 
      icon: '💻', 
      color: 'bg-green-100 text-green-800 border-green-300' 
    },
    [InitiativeCategory.OPERATIONS]: { 
      icon: '⚙️', 
      color: 'bg-orange-100 text-orange-800 border-orange-300' 
    },
    [InitiativeCategory.MARKETING]: { 
      icon: '📢', 
      color: 'bg-pink-100 text-pink-800 border-pink-300' 
    },
    [InitiativeCategory.OTHER]: { 
      icon: '📝', 
      color: 'bg-gray-100 text-gray-800 border-gray-300' 
    }
  };

  return categoryConfig[category] || categoryConfig[InitiativeCategory.OTHER];
}

/**
 * 優先度の表示用スタイルを取得
 */
export function getPriorityDisplay(priority: Priority) {
  const priorityConfig = {
    [Priority.HIGH]: { 
      icon: '🔴', 
      color: 'bg-red-100 text-red-800 border-red-300',
      textColor: 'text-red-600'
    },
    [Priority.MEDIUM]: { 
      icon: '🟡', 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      textColor: 'text-yellow-600'
    },
    [Priority.LOW]: { 
      icon: '🟢', 
      color: 'bg-green-100 text-green-800 border-green-300',
      textColor: 'text-green-600'
    }
  };

  return priorityConfig[priority] || priorityConfig[Priority.MEDIUM];
}

/**
 * 日付をフォーマット
 */
export function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
}

/**
 * 相対時間の表示（例：3日前）
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = date instanceof Date ? date : new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays < 30) return `${diffDays}日前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
  return `${Math.floor(diffDays / 365)}年前`;
}

/**
 * バージョン変更の重要度を判定
 */
export function getChangeImportance(differences: VersionDiff[]): 'major' | 'minor' | 'patch' {
  const majorFields = ['status', 'priority'];
  const minorFields = ['issue', 'cause', 'action', 'assignee', 'dueDate'];
  
  const hasMajorChange = differences.some(diff => majorFields.includes(diff.field));
  const hasMinorChange = differences.some(diff => minorFields.includes(diff.field));
  
  if (hasMajorChange) return 'major';
  if (hasMinorChange) return 'minor';
  return 'patch';
} 
