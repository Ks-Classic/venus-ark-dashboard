import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

// Notion APIクライアントの初期化
const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY,
});

const MEMBER_DB_ID = process.env.NOTION_MEMBER_DB_ID;

async function debugNotionRawData() {
  console.log('🔍 Notion生データ構造確認開始');
  console.log('='.repeat(50));

  if (!MEMBER_DB_ID) {
    console.error('❌ NOTION_MEMBER_DB_ID が設定されていません');
    return;
  }

  try {
    // 1. データベース構造の確認
    console.log('\n📊 データベース構造確認');
    const database = await notion.databases.retrieve({
      database_id: MEMBER_DB_ID,
    });

    console.log('データベース名:', (database as any).title?.[0]?.plain_text);
    console.log('プロパティ一覧:');
    
    Object.entries(database.properties).forEach(([key, property]) => {
      console.log(`  - ${key}: ${property.type}`);
      if (property.type === 'select' || property.type === 'multi_select') {
        const options = (property as any)[property.type]?.options?.map((o: any) => o.name);
        console.log(`    オプション: ${JSON.stringify(options)}`);
      }
    });

    // 2. 実際のデータを数件取得
    console.log('\n📋 実際のデータサンプル（最大5件）');
    const response = await notion.databases.query({
      database_id: MEMBER_DB_ID,
      page_size: 5,
    });

    console.log(`取得件数: ${response.results.length}`);

    response.results.forEach((page: any, index) => {
      console.log(`\n--- ページ ${index + 1} ---`);
      console.log('ID:', page.id);
      console.log('名前:', page.properties['氏名']?.title?.[0]?.plain_text || page.properties['名前']?.title?.[0]?.plain_text || 'Unknown');
      
      // 重要な日付フィールドの確認
      console.log('\n重要フィールドの生データ:');
      
      // 考えられるフィールド名のバリエーション
      const fieldVariations = {
        '最新業務開始日': ['最新業務開始日', '最新稼働開始日', '業務開始日', 'lastWorkStartDate'],
        '最新業務終了日': ['最新業務終了日', '最新稼働終了日', '業務終了日', 'lastWorkEndDate'],
        'カウンセリング開始日': ['カウンセリング開始日', '初回カウンセリング実施日', 'firstCounselingDate'],
        '契約終了日': ['契約終了日', '業務委託契約終了日', 'contractEndDate']
      };

      Object.entries(fieldVariations).forEach(([label, variations]) => {
        console.log(`\n${label}:`);
        let found = false;
        
        variations.forEach(variation => {
          if (page.properties[variation]) {
            console.log(`  ${variation}:`, JSON.stringify(page.properties[variation], null, 2));
            found = true;
          }
        });
        
        if (!found) {
          console.log(`  ❌ 該当するフィールドが見つかりません`);
        }
      });

      // 全プロパティのキー一覧表示
      console.log('\n全プロパティキー:');
      Object.keys(page.properties).forEach(key => {
        console.log(`  - "${key}": ${page.properties[key].type}`);
      });
    });

    // 3. 日付フィールドの詳細分析
    console.log('\n📅 日付フィールドの詳細分析');
    const dateFields = Object.entries(database.properties).filter(([key, property]) => property.type === 'date');
    
    console.log(`日付フィールド数: ${dateFields.length}`);
    dateFields.forEach(([key, property]) => {
      console.log(`  - "${key}": ${property.type}`);
    });

  } catch (error) {
    console.error('❌ エラー発生:', error);
  }

  console.log('\n='.repeat(50));
  console.log('🔍 Notion生データ構造確認完了');
}

// 実行
debugNotionRawData().catch(console.error); 