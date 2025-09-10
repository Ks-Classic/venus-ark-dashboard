import dotenv from 'dotenv';
import { Client } from '@notionhq/client';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

async function checkNotionFields() {
  try {
    console.log('=== Notionデータベースフィールド確認 ===');
    
    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
    });
    
    const MEMBER_DB_ID = process.env.NOTION_MEMBER_DB_ID;
    
    if (!MEMBER_DB_ID) {
      console.error('NOTION_MEMBER_DB_ID が設定されていません');
      return;
    }
    
    // データベース情報を取得
    const dbInfo = await notion.databases.retrieve({ 
      database_id: MEMBER_DB_ID 
    });
    
    console.log(`データベース名: ${(dbInfo as any).title?.[0]?.plain_text || 'Unknown'}`);
    console.log('\n=== 利用可能なプロパティ ===');
    
    const properties = (dbInfo as any).properties;
    Object.keys(properties).forEach(key => {
      const prop = properties[key];
      console.log(`${key}: ${prop.type}`);
    });
    
    // 実際のデータを数件取得してフィールドの値を確認
    console.log('\n=== 実際のデータサンプル ===');
    const response = await notion.databases.query({
      database_id: MEMBER_DB_ID,
      page_size: 3
    });
    
    response.results.forEach((page: any, index: number) => {
      console.log(`\n[${index + 1}] ${page.properties['名前']?.title?.[0]?.plain_text || 'Unknown'}`);
      
      // 重要なフィールドの値を確認
      const importantFields = [
        '初回稼働開始日',
        '最新業務開始日', 
        '最新業務終了日',
        '業務委託契約終了日',
        'ステータス'
      ];
      
      importantFields.forEach(field => {
        const value = page.properties[field];
        if (value) {
          let displayValue = 'null';
          if (value.type === 'date' && value.date) {
            displayValue = value.date.start;
          } else if (value.type === 'select' && value.select) {
            displayValue = value.select.name;
          } else if (value.type === 'rich_text' && value.rich_text?.[0]) {
            displayValue = value.rich_text[0].plain_text;
          }
          console.log(`  ${field}: ${displayValue}`);
        } else {
          console.log(`  ${field}: フィールドなし`);
        }
      });
      
      // ページ内のブロック（稼働履歴テーブル）も確認
      console.log(`  ページID: ${page.id}`);
    });
    
    // 1つのページの詳細ブロックを確認
    if (response.results.length > 0) {
      const firstPageId = response.results[0].id;
      console.log(`\n=== ページ内ブロック確認 (${firstPageId}) ===`);
      
      try {
        const blocks = await notion.blocks.children.list({
          block_id: firstPageId,
          page_size: 10
        });
        
        console.log(`ブロック数: ${blocks.results.length}`);
        blocks.results.forEach((block: any, index: number) => {
          console.log(`[${index + 1}] ${block.type}`);
          if (block.type === 'table') {
            console.log(`  テーブル発見 - ID: ${block.id}`);
          }
        });
      } catch (error) {
        console.log(`ブロック取得エラー: ${error}`);
      }
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

checkNotionFields(); 