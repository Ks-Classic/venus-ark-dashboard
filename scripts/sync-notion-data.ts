#!/usr/bin/env ts-node
/**
 * Notionからメンバー・案件データをFirestoreに同期するスクリプト
 * 
 * 使用方法:
 * ts-node --require tsconfig-paths/register scripts/sync-notion-data.ts
 */

import dotenv from 'dotenv';
import { initializeFirebaseAdmin } from '@/lib/firebase/admin';
import { fetchMembers, fetchProjects, fetchMemberProjectStatuses } from '@/lib/integrations/notion';
import { saveMembers } from '@/lib/firestore/members';
import { saveProjects } from '@/lib/firestore/projects';
import { Member, WorkHistory } from '@/lib/types/member';
import { Project, MemberProjectStatus } from '@/lib/types/project';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

// Firebase Admin SDKの初期化
initializeFirebaseAdmin();

/**
 * メイン処理
 */
async function main() {
  console.log('=== Notionデータ同期処理開始 ===');
  console.log(`実行時刻: ${new Date().toISOString()}`);
  
  try {
    // 1. 案件データの同期
    console.log('\n1. 案件データの同期...');
    const projects = await syncProjects();
    console.log(`✅ ${projects.length}件の案件データを同期しました`);

    // 2. メンバーデータの同期 (稼働履歴を含む)
    console.log('\n2. メンバーデータの同期...');
    const members = await syncMembersWithWorkHistory();
    console.log(`✅ ${members.length}件のメンバーデータを同期しました`);
    
    // 3. 統計情報の表示
    displayStatistics(members, projects);
    
    console.log('\n=== 同期処理完了 ===');
  } catch (error) {
    console.error('同期処理エラー:', error);
    process.exit(1);
  }
}

/**
 * メンバーデータと稼働履歴の同期
 */
async function syncMembersWithWorkHistory(): Promise<Member[]> {
  try {
    // Notionからメンバーデータと稼働状況データを並行して取得
    const [members, statuses] = await Promise.all([
      fetchMembers(),
      fetchMemberProjectStatuses()
    ]);
    
    // 稼働状況をメンバーごとに集約
    const workHistoryByMember = new Map<string, WorkHistory[]>();
    for (const status of statuses) {
      if (!workHistoryByMember.has(status.memberId)) {
        workHistoryByMember.set(status.memberId, []);
      }
      workHistoryByMember.get(status.memberId)!.push({
        id: status.id,
        memberId: status.memberId,
        memberName: status.memberName,
        projectId: status.projectId,
        projectName: status.projectName,
        managementNumber: status.managementNumber,
        startDate: status.startDate,
        endDate: status.endDate,
        endReason: status.endReason,
        status: status.status,
        hourlyRate: status.hourlyRate,
        monthlyHours: status.monthlyHours,
        notes: status.notes,
      });
    }

    // メンバーデータに稼働履歴を統合
    const membersWithHistory = members.map(member => ({
      ...member,
      workHistory: workHistoryByMember.get(member.id) || []
    }));

    // 名寄せ処理
    const mergedMembers = performNameMerging(membersWithHistory);
    
    // Firestoreに保存
    await saveMembers(mergedMembers, true);
    
    return mergedMembers;
  } catch (error) {
    console.error('メンバー同期エラー:', error);
    throw error;
  }
}


/**
 * 案件データの同期
 */
async function syncProjects(): Promise<Project[]> {
  try {
    // Notionから案件データを取得（全データを取得）
    const projects = await fetchProjects(); // 制限なしで全データ取得
    
    // Firestoreに保存
    await saveProjects(projects, true);
    
    return projects;
  } catch (error) {
    console.error('案件同期エラー:', error);
    throw error;
  }
}

/**
 * 統計情報の表示
 */
function displayStatistics(
  members: Member[], 
  projects: Project[]
) {
  console.log('\n=== 同期結果統計 ===');
  
  // メンバー統計
  const membersByStatus = members.reduce((acc, member) => {
    acc[member.status] = (acc[member.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n【メンバー状態別集計】');
  Object.entries(membersByStatus).forEach(([status, count]) => {
    console.log(`- ${status}: ${count}名`);
  });
  
  // 職種別集計
  const membersByCategory = members.reduce((acc, member) => {
    acc[member.jobCategory] = (acc[member.jobCategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n【職種別メンバー集計】');
  Object.entries(membersByCategory).forEach(([category, count]) => {
    console.log(`- ${category}: ${count}名`);
  });
  
  // 案件統計
  const projectsByStatus = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n【案件状態別集計】');
  Object.entries(projectsByStatus).forEach(([status, count]) => {
    console.log(`- ${status}: ${count}件`);
  });
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
} 