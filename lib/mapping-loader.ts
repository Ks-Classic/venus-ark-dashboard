import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

// Google Sheets マッピング設定の型定義
export interface SheetsMapping {
  recruitment_sheets: {
    common_columns: Record<string, string>;
    sheet_name_patterns: Record<string, string[]>;
    indeed_columns: Record<string, string>;
    media_specific_columns: Record<string, Record<string, string>>;
  };
  entry_form_sheets: {
    basic_columns: Record<string, string>;
    job_specific_columns: Record<string, Record<string, string>>;
  };
  column_aliases: Record<string, string[]>;
  validation: {
    required_columns: string[];
    date_columns: string[];
    email_columns: string[];
    status_values: {
      valid_statuses: string[];
    };
  };
}

// Notion マッピング設定の型定義
export interface NotionMapping {
  member_database: {
    database_id: string;
    properties: Record<string, {
      property_name: string;
      property_id: string;
      type: string;
    }>;
  };
  project_database: {
    database_id: string;
    properties: Record<string, {
      property_name: string;
      property_id: string;
      type: string;
    }>;
  };
  member_project_database: {
    database_id: string;
    properties: Record<string, {
      property_name: string;
      property_id: string;
      type: string;
    }>;
  };
  property_value_mappings: {
    member_status: Record<string, string>;
    project_status: Record<string, string>;
    member_project_status: Record<string, string>;
  };
  validation: {
    required_properties: Record<string, string[]>;
    date_properties: string[];
    number_properties: string[];
  };
}

// キャッシュ用のグローバル変数
let sheetsMapping: SheetsMapping | null = null;
let notionMapping: NotionMapping | null = null;

/**
 * Google Sheets マッピング設定を読み込む
 */
export function loadSheetsMapping(): SheetsMapping {
  if (sheetsMapping) {
    return sheetsMapping;
  }

  try {
    const configPath = join(process.cwd(), 'lib', 'config', 'sheets-mapping.yaml');
    const fileContents = readFileSync(configPath, 'utf8');
    sheetsMapping = yaml.load(fileContents) as SheetsMapping;
    
    console.log('[MappingLoader] Google Sheets マッピング設定を読み込みました');
    return sheetsMapping;
  } catch (error) {
    console.error('[MappingLoader] Google Sheets マッピング設定の読み込みに失敗:', error);
    throw new Error('Google Sheets マッピング設定の読み込みに失敗しました');
  }
}

/**
 * Notion マッピング設定を読み込��
 */
export function loadNotionMapping(): NotionMapping {
  if (notionMapping) {
    return notionMapping;
  }

  try {
    const configPath = join(process.cwd(), 'lib', 'config', 'notion-mapping.yaml');
    const fileContents = readFileSync(configPath, 'utf8');
    notionMapping = yaml.load(fileContents) as NotionMapping;
    
    console.log('[MappingLoader] Notion マッピング設定を読み込みました');
    return notionMapping;
  } catch (error) {
    console.error('[MappingLoader] Notion マッピング設定の読み込みに失敗:', error);
    throw new Error('Notion マッピング設定の読み込みに失敗しました');
  }
}

/**
 * Google Sheets の列名を取得する（エイリアス対応）
 */
export function getSheetColumnName(
  logicalName: string,
  sheetType: 'recruitment' | 'entry_form' = 'recruitment'
): string {
  const mapping = loadSheetsMapping();
  
  // 基本的な列名を取得
  let columnName: string | undefined;
  
  if (sheetType === 'recruitment') {
    columnName = mapping.recruitment_sheets.common_columns[logicalName];
  } else {
    columnName = mapping.entry_form_sheets.basic_columns[logicalName];
  }
  
  // エイリアスから検索
  if (!columnName) {
    const aliases = mapping.column_aliases[logicalName];
    if (aliases && aliases.length > 0) {
      columnName = aliases[0]; // 最初のエイリアスを使用
    }
  }
  
  if (!columnName) {
    console.warn(`[MappingLoader] 列名が見つかりません: ${logicalName}`);
    return logicalName; // フォールバック
  }
  
  return columnName;
}

/**
 * 複数の列名候補を取得する（表記揺れ対応）
 */
export function getSheetColumnNameCandidates(logicalName: string): string[] {
  const mapping = loadSheetsMapping();
  const candidates: string[] = [];
  
  // 基本的な列名を追加
  const recruitmentColumn = mapping.recruitment_sheets.common_columns[logicalName];
  const entryFormColumn = mapping.entry_form_sheets.basic_columns[logicalName];
  
  if (recruitmentColumn) candidates.push(recruitmentColumn);
  if (entryFormColumn && entryFormColumn !== recruitmentColumn) {
    candidates.push(entryFormColumn);
  }
  
  // エイリアスを追加
  const aliases = mapping.column_aliases[logicalName];
  if (aliases) {
    aliases.forEach(alias => {
      if (!candidates.includes(alias)) {
        candidates.push(alias);
      }
    });
  }
  
  return candidates.length > 0 ? candidates : [logicalName];
}

/**
 * シート名から職種を判定する
 */
export function getJobCategoryFromSheetName(sheetName: string): string | null {
  const mapping = loadSheetsMapping();
  const patterns = mapping.recruitment_sheets.sheet_name_patterns;
  
  for (const [jobCategory, sheetNames] of Object.entries(patterns)) {
    if (sheetNames.some(pattern => sheetName.includes(pattern))) {
      return jobCategory;
    }
  }
  
  return null;
}

/**
 * Notion プロパティ名を取得する
 */
export function getNotionPropertyName(
  database: 'member' | 'project' | 'member_project',
  logicalName: string
): string {
  const mapping = loadNotionMapping();
  
  let databaseConfig;
  switch (database) {
    case 'member':
      databaseConfig = mapping.member_database;
      break;
    case 'project':
      databaseConfig = mapping.project_database;
      break;
    case 'member_project':
      databaseConfig = mapping.member_project_database;
      break;
    default:
      throw new Error(`不明なデータベース: ${database}`);
  }
  
  const property = databaseConfig.properties[logicalName];
  if (!property) {
    console.warn(`[MappingLoader] Notionプロパティが見つかりません: ${database}.${logicalName}`);
    return logicalName; // フォールバック
  }
  
  return property.property_name;
}

/**
 * Notion プロパティ ID を取得する
 */
export function getNotionPropertyId(
  database: 'member' | 'project' | 'member_project',
  logicalName: string
): string {
  const mapping = loadNotionMapping();
  
  let databaseConfig;
  switch (database) {
    case 'member':
      databaseConfig = mapping.member_database;
      break;
    case 'project':
      databaseConfig = mapping.project_database;
      break;
    case 'member_project':
      databaseConfig = mapping.member_project_database;
      break;
    default:
      throw new Error(`不明なデータベース: ${database}`);
  }
  
  const property = databaseConfig.properties[logicalName];
  if (!property) {
    console.warn(`[MappingLoader] NotionプロパティIDが見つかりません: ${database}.${logicalName}`);
    return logicalName; // フォールバック
  }
  
  return property.property_id;
}

/**
 * Notion プロパティ値をマッピングする
 */
export function mapNotionPropertyValue(
  propertyType: 'member_status' | 'project_status' | 'member_project_status',
  internalValue: string
): string {
  const mapping = loadNotionMapping();
  const valueMapping = mapping.property_value_mappings[propertyType];
  
  return valueMapping[internalValue] || internalValue;
}

/**
 * 設定の妥当性をチェックする
 */
export function validateMappingConfig(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  try {
    const sheetsConfig = loadSheetsMapping();
    const notionConfig = loadNotionMapping();
    
    // 必須設定のチェック
    if (!sheetsConfig.recruitment_sheets.common_columns.applicant_name) {
      errors.push('Google Sheets: applicant_name の設定が不足しています');
    }
    
    if (!notionConfig.member_database.properties.name) {
      errors.push('Notion: member_database.name の設定が不足しています');
    }
    
    // バリデーション設定のチェ���ク
    if (!sheetsConfig.validation.required_columns.includes('applicant_name')) {
      errors.push('Google Sheets: バリデーション設定に applicant_name が含まれていません');
    }
    
    console.log(`[MappingLoader] 設定検証完了: ${errors.length === 0 ? '正常' : `${errors.length}個のエラー`}`);
    
  } catch (error) {
    errors.push(`設定読み込みエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * キャッシュをクリアする（テスト用）
 */
export function clearMappingCache(): void {
  sheetsMapping = null;
  notionMapping = null;
  console.log('[MappingLoader] キャッシュをクリアしました');
} 
