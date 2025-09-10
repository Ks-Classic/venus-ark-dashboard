#!/usr/bin/env ts-node
/**
 * Notionのステータス値を詳細に確認するデバッグスクリプト
 */

import dotenv from 'dotenv';
import { fetchMembers } from '@/lib/integrations/notion';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

async function debugNotionStatuses() {
  console.log('=== Notionステータス値デバッグ開始 ===');
  
  try {
    // メンバーデータを取得
    const members = await fetchMembers(20); // 最初の20件のみ取得
    
    console.log(`取得したメンバー数: ${members.length}`);
    
    // ステータス値の分布を確認
    const statusCounts = new Map<string, number>();
    const statusExamples = new Map<string, string[]>();
    
    members.forEach(member => {
      const status = member.status;
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      
      if (!statusExamples.has(status)) {
        statusExamples.set(status, []);
      }
      const examples = statusExamples.get(status)!;
      if (examples.length < 3) {
        examples.push(member.name);
      }
    });
    
    console.log('\n🔍 ステータス値分布:');
    for (const [status, count] of statusCounts.entries()) {
      const examples = statusExamples.get(status) || [];
      console.log(`  "${status}": ${count}人 (例: ${examples.join(', ')})`);
    }
    
    // 特定のステータスのメンバーを詳細表示
    console.log('\n📋 詳細情報:');
    const targetStatuses = ['working', 'job_matching', 'interview_prep', 'interview', 'result_waiting', 'hired'];
    
    for (const targetStatus of targetStatuses) {
      const targetMembers = members.filter(m => m.status === targetStatus);
      if (targetMembers.length > 0) {
        console.log(`\n${targetStatus} (${targetMembers.length}人):`);
        targetMembers.forEach(member => {
          console.log(`  - ${member.name} (ID: ${member.id})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ エラー発生:', error);
  }
  
  console.log('\n=== デバッグ完了 ===');
}

// メイン実行
debugNotionStatuses().catch(console.error); 