#!/usr/bin/env ts-node
/**
 * Notionテーブルの構造をデバッグするスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/debug-notion-table-structure.ts
 */

import dotenv from 'dotenv';
import { getNotionClient, getNotionConfig } from '@/lib/integrations/notion';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

/**
 * メイン処理
 */
async function main() {
  console.log('=== Notionテーブル構造デバッグ ===');
  
  try {
    const notion = getNotionClient();
    const { MEMBER_DB_ID } = getNotionConfig();
    
    // サンプルメンバーを1件取得
    const response = await notion.databases.query({
      database_id: MEMBER_DB_ID!,
      page_size: 1,
    });
    
    if (response.results.length === 0) {
      console.log('メンバーが見つかりません');
      return;
    }
    
    const member = response.results[0];
    const memberName = (member as any).properties['氏名']?.title?.[0]?.plain_text || 'Unknown';
    console.log(`\n=== サンプルメンバー: ${memberName} ===`);
    console.log(`Page ID: ${member.id}`);
    
    // ページのブロック一覧を取得
    console.log('\n=== ページブロック構造 ===');
    const blocks = await notion.blocks.children.list({
      block_id: member.id,
      page_size: 100,
    });
    
    console.log(`総ブロック数: ${blocks.results.length}`);
    
    blocks.results.forEach((block: any, index) => {
      console.log(`\nブロック ${index + 1}:`);
      console.log(`- タイプ: ${block.type}`);
      console.log(`- ID: ${block.id}`);
      
      if (block.type === 'table') {
        console.log(`- テーブル行数: ${block.table.table_width}`);
        console.log(`- テーブル列数: ${block.table.table_width}`);
        console.log('- このテーブルの詳細を取得します...');
        
        // テーブルの行を取得
        fetchTableDetails(notion, block.id, memberName);
      } else if (block.type === 'paragraph') {
        const text = block.paragraph?.rich_text?.[0]?.plain_text || '';
        console.log(`- テキスト: "${text}"`);
      } else if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
        const text = block[block.type]?.rich_text?.[0]?.plain_text || '';
        console.log(`- 見出し: "${text}"`);
      }
    });
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

/**
 * テーブルの詳細を取得
 */
async function fetchTableDetails(notion: any, tableId: string, memberName: string) {
  try {
    console.log(`\n=== テーブル詳細 (${memberName}) ===`);
    
    const tableRows = await notion.blocks.children.list({
      block_id: tableId,
      page_size: 100,
    });
    
    console.log(`テーブル行数: ${tableRows.results.length}`);
    
    tableRows.results.forEach((row: any, index) => {
      if (row.type === 'table_row') {
        const cells = row.table_row.cells;
        console.log(`\n行 ${index + 1}: (${cells.length}列)`);
        
        cells.forEach((cell: any, cellIndex: number) => {
          const cellText = cell[0]?.plain_text || '';
          console.log(`  列${cellIndex + 1}: "${cellText}"`);
        });
        
        // 最初の3行だけ詳細表示
        if (index >= 3) {
          console.log(`  ... (残り${tableRows.results.length - 3}行は省略)`);
          return;
        }
      }
    });
    
  } catch (error) {
    console.error('テーブル詳細取得エラー:', error);
  }
}

// 直接実行可能にする
function getNotionClient() {
  const { Client } = require('@notionhq/client');
  return new Client({
    auth: process.env.NOTION_API_KEY,
  });
}

function getNotionConfig() {
  return {
    MEMBER_DB_ID: process.env.NOTION_MEMBER_DB_ID,
    PROJECT_DB_ID: process.env.NOTION_PROJECT_DB_ID,
    MEMBER_PROJECT_STATUS_DB_ID: process.env.NOTION_MEMBER_PROJECT_STATUS_DB_ID,
  };
}

main(); 