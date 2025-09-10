import { Client } from '@notionhq/client';
import * as fs from 'fs';
import * as path from 'path';

// 環境変数からNotion設定を取得
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_IDS = {
  projects: '0f8d9b8cf8ae4ab7ac1d4c6ecbf445ac', // 案件管理ボード
  members: '527e0e6ee54d4d9ba922eadef440b891', // メンバー進捗管理DB
  memberProjects: '1efefecd6152802f96b8e9141b41d86e' // メンバー別案件状況管理
};

if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN環境変数が設定されていません');
  console.log('📝 .env.localファイルにNOTION_TOKEN=your_integration_tokenを追加してください');
  process.exit(1);
}

const notion = new Client({
  auth: NOTION_TOKEN,
});

interface DatabaseAnalysis {
  id: string;
  title: string;
  properties: Record<string, any>;
  samplePages: any[];
  totalPages: number;
}

async function analyzeDatabaseStructure(databaseId: string, name: string): Promise<DatabaseAnalysis> {
  try {
    console.log(`\n🔍 ${name} データベースを分析中...`);
    
    // データベース情報を取得
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });
    
    const databaseTitle = 'title' in database && database.title?.[0]?.plain_text || 'Unknown';
    console.log(`📊 データベース名: ${databaseTitle}`);
    
    // プロパティ構造を分析
    const properties = 'properties' in database ? database.properties : {};
    console.log(`📋 プロパティ数: ${Object.keys(properties).length}`);
    
    // サンプルページを取得（最大5件）
    const pagesResponse = await notion.databases.query({
      database_id: databaseId,
      page_size: 5,
    });
    
    console.log(`📄 総ページ数: ${pagesResponse.results.length}件（サンプル）`);
    
    // プロパティの詳細を表示
    console.log('\n📝 プロパティ詳細:');
    Object.entries(properties).forEach(([key, prop]: [string, any]) => {
      console.log(`  - ${key}: ${prop.type} ${prop.type === 'relation' ? `(→ ${prop.relation?.database_id})` : ''}`);
    });
    
    return {
      id: databaseId,
      title: databaseTitle,
      properties,
      samplePages: pagesResponse.results,
      totalPages: pagesResponse.results.length,
    };
    
  } catch (error: any) {
    console.error(`❌ ${name} データベースの分析に失敗:`, error.message);
    if (error.code === 'object_not_found') {
      console.log('💡 データベースIDが正しいか、Integration権限が設定されているか確認してください');
    }
    throw error;
  }
}

async function generateAnalysisReport(analyses: DatabaseAnalysis[]) {
  const report = {
    timestamp: new Date().toISOString(),
    databases: analyses,
    summary: {
      totalDatabases: analyses.length,
      totalProperties: analyses.reduce((sum, db) => sum + Object.keys(db.properties).length, 0),
      relationMappings: [] as Array<{from: string, to: string, property: string}>
    }
  };
  
  // リレーション関係を分析
  analyses.forEach(db => {
    Object.entries(db.properties).forEach(([propName, prop]: [string, any]) => {
      if (prop.type === 'relation' && prop.relation?.database_id) {
        const targetDb = analyses.find(a => a.id === prop.relation.database_id);
        report.summary.relationMappings.push({
          from: db.title,
          to: targetDb?.title || prop.relation.database_id,
          property: propName
        });
      }
    });
  });
  
  // レポートファイルを保存
  const reportPath = path.join(process.cwd(), 'docs', 'notion-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  
  console.log(`\n📊 分析レポートを保存しました: ${reportPath}`);
  return report;
}

function generateDataModelRecommendations(analyses: DatabaseAnalysis[]) {
  console.log('\n🎯 Firestoreデータモデル推奨事項:');
  
  analyses.forEach(db => {
    console.log(`\n📦 ${db.title} → Firestoreコレクション設計:`);
    
    const firestoreFields: string[] = [];
    const relationFields: string[] = [];
    
    Object.entries(db.properties).forEach(([propName, prop]: [string, any]) => {
      switch (prop.type) {
        case 'title':
          firestoreFields.push(`  ${propName}: string (title)`);
          break;
        case 'rich_text':
        case 'text':
          firestoreFields.push(`  ${propName}: string`);
          break;
        case 'number':
          firestoreFields.push(`  ${propName}: number`);
          break;
        case 'date':
          firestoreFields.push(`  ${propName}: Timestamp`);
          break;
        case 'select':
          firestoreFields.push(`  ${propName}: string (select: ${prop.select?.options?.map((o: any) => o.name).join(', ') || 'unknown'})`);
          break;
        case 'multi_select':
          firestoreFields.push(`  ${propName}: string[] (multi_select)`);
          break;
        case 'checkbox':
          firestoreFields.push(`  ${propName}: boolean`);
          break;
        case 'relation':
          relationFields.push(`  ${propName}: string[] (relation to ${prop.relation?.database_id})`);
          break;
        case 'formula':
          firestoreFields.push(`  ${propName}: any (formula - 計算結果を保存)`);
          break;
        default:
          firestoreFields.push(`  ${propName}: any (${prop.type})`);
      }
    });
    
    console.log('  基本フィールド:');
    firestoreFields.forEach(field => console.log(field));
    
    if (relationFields.length > 0) {
      console.log('  リレーションフィールド:');
      relationFields.forEach(field => console.log(field));
    }
    
    console.log('  システムフィールド:');
    console.log('    notionPageId: string');
    console.log('    createdAt: Timestamp');
    console.log('    updatedAt: Timestamp');
  });
}

async function main() {
  console.log('🚀 Notion データベース構造分析を開始します...');
  console.log(`📋 分析対象: ${Object.keys(DATABASE_IDS).length}個のデータベース`);
  
  try {
    const analyses: DatabaseAnalysis[] = [];
    
    // 各データベースを順次分析
    for (const [name, id] of Object.entries(DATABASE_IDS)) {
      const analysis = await analyzeDatabaseStructure(id, name);
      analyses.push(analysis);
      
      // API制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 分析レポート生成
    const report = await generateAnalysisReport(analyses);
    
    // データモデル推奨事項を表示
    generateDataModelRecommendations(analyses);
    
    console.log('\n✅ 分析完了！');
    console.log('📄 詳細な分析結果は docs/notion-analysis-report.json を確認してください');
    console.log('\n🔄 次のステップ:');
    console.log('1. 分析結果を基にFirestoreデータモデルを最適化');
    console.log('2. ER図の作成');
    console.log('3. データ同期ロジックの実装');
    
  } catch (error: any) {
    console.error('❌ 分析中にエラーが発生しました:', error.message);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

export { analyzeDatabaseStructure, generateAnalysisReport }; 