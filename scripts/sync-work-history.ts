#!/usr/bin/env ts-node
/**
 * Notionから稼働履歴をFirestoreに同期するスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/sync-work-history.ts
 */

import dotenv from 'dotenv';
import { initializeFirebaseAdmin } from '@/lib/firebase/admin';
import { fetchMembers } from '@/lib/integrations/notion';
import { saveWorkHistories } from '@/lib/firestore/work-history';
import { WorkHistory, WorkStatus } from '@/lib/types/member';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

// Firebase Admin SDKの初期化
initializeFirebaseAdmin();

/**
 * メイン処理
 */
async function main() {
  console.log('=== 稼働履歴同期処理開始 ===');
  console.log(`実行時刻: ${new Date().toISOString()}`);
  
  try {
    // 1. 全メンバーの稼働履歴を取得
    console.log('\n1. メンバーデータと稼働履歴の取得...');
    const members = await fetchMembers(); // 全メンバー取得
    console.log(`✅ ${members.length}名のメンバーデータを取得しました`);
    
    // 2. 稼働履歴を収集・正規化
    console.log('\n2. 稼働履歴の収集・正規化...');
    const allWorkHistory: WorkHistory[] = [];
    let memberCount = 0;
    let historyCount = 0;
    
    for (const member of members) {
      if (member.workHistory && member.workHistory.length > 0) {
        memberCount++;
        
        // 各稼働履歴を正規化
        for (const history of member.workHistory) {
          const normalizedHistory: WorkHistory = {
            id: `${member.id}_${history.id}`, // ユニークIDを生成
            memberId: member.id,
            memberName: member.name,
            projectId: history.projectId,
            projectName: history.projectName,
            managementNumber: history.managementNumber,
            startDate: history.startDate,
            endDate: history.endDate,
            endReason: history.endReason,
            status: history.status,
            hourlyRate: history.hourlyRate,
            monthlyHours: history.monthlyHours,
            notes: history.notes,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          allWorkHistory.push(normalizedHistory);
          historyCount++;
          
          console.log(`  ${member.name}: ${history.projectName} (${history.managementNumber || 'ID不明'}) ${history.startDate.toISOString().split('T')[0]} ～ ${history.endDate?.toISOString().split('T')[0] || '継続中'}`);
        }
      }
    }
    
    console.log(`✅ ${memberCount}名から${historyCount}件の稼働履歴を収集しました`);
    
    // 3. Firestoreに保存
    if (allWorkHistory.length > 0) {
      console.log('\n3. 稼働履歴をFirestoreに保存...');
      await saveWorkHistories(allWorkHistory, true);
      console.log(`✅ ${allWorkHistory.length}件の稼働履歴を保存しました`);
    } else {
      console.log('\n保存する稼働履歴がありません');
    }
    
    // 4. 統計情報の表示
    displayStatistics(allWorkHistory);
    
    console.log('\n=== 稼働履歴同期処理完了 ===');
  } catch (error) {
    console.error('同期処理エラー:', error);
    process.exit(1);
  }
}

/**
 * 統計情報の表示
 */
function displayStatistics(workHistory: WorkHistory[]) {
  console.log('\n=== 稼働履歴統計 ===');
  
  // ステータス別集計
  const statusStats = workHistory.reduce((acc, history) => {
    acc[history.status] = (acc[history.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n【ステータス別集計】');
  Object.entries(statusStats).forEach(([status, count]) => {
    console.log(`- ${status}: ${count}件`);
  });
  
  // 案件別集計（上位10件）
  const projectStats = workHistory.reduce((acc, history) => {
    const key = history.managementNumber || history.projectName;
    if (!acc[key]) {
      acc[key] = {
        name: history.projectName,
        managementNumber: history.managementNumber,
        count: 0,
        members: new Set()
      };
    }
    acc[key].count++;
    acc[key].members.add(history.memberName);
    return acc;
  }, {} as Record<string, any>);
  
  const topProjects = Object.values(projectStats)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);
  
  console.log('\n【案件別稼働実績（上位10件）】');
  topProjects.forEach((project: any, index) => {
    console.log(`${index + 1}. ${project.name} (${project.managementNumber || 'ID不明'}): ${project.count}件, ${project.members.size}名`);
  });
  
  // 期間別集計
  const currentYear = new Date().getFullYear();
  const yearlyStats = workHistory.reduce((acc, history) => {
    const year = history.startDate.getFullYear();
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  console.log('\n【年別稼働開始件数】');
  Object.entries(yearlyStats)
    .sort(([a], [b]) => Number(b) - Number(a))
    .forEach(([year, count]) => {
      console.log(`- ${year}年: ${count}件`);
    });
  
  // 管理番号がある案件の統計
  const withManagementNumber = workHistory.filter(h => h.managementNumber);
  console.log(`\n【管理番号付き案件】: ${withManagementNumber.length}件 / ${workHistory.length}件 (${Math.round(withManagementNumber.length / workHistory.length * 100)}%)`);
}

main(); 