import dotenv from 'dotenv';
import { getAdminDb } from '../lib/firebase/admin';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

/**
 * 月内の週番号を計算（土曜日開始）
 */
function getWeekOfMonth(date: Date): number {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstSaturday = new Date(firstDayOfMonth);
  
  // 月の最初の土曜日を見つける
  while (firstSaturday.getDay() !== 6) {
    firstSaturday.setDate(firstSaturday.getDate() + 1);
  }
  
  // 対象日が月の最初の土曜日より前の場合は前月の週
  if (date < firstSaturday) {
    return 1;
  }
  
  // 土曜日からの週数を計算
  const diffInDays = Math.floor((date.getTime() - firstSaturday.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffInDays / 7) + 1;
  
  return Math.min(weekNumber, 5); // 最大5週まで
}

async function debugCalculation() {
  try {
    console.log('=== 計算ロジック詳細デバッグ ===');
    
    const db = getAdminDb();
    const snapshot = await db.collection('members').get();
    const members = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        applicationDate: data.applicationDate?.toDate(),
        hireDate: data.hireDate?.toDate(),
        firstWorkStartDate: data.firstWorkStartDate?.toDate(),
        firstCounselingDate: data.firstCounselingDate?.toDate(),
        lastWorkStartDate: data.lastWorkStartDate?.toDate(),
        lastWorkEndDate: data.lastWorkEndDate?.toDate(),
        contractEndDate: data.contractEndDate?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        lastSyncedAt: data.lastSyncedAt?.toDate(),
      };
    });
    
    console.log(`総メンバー数: ${members.length}件`);
    
    // 6月3週目を例に計算
    const year = 2025;
    const month = 6;
    const week = 3;
    
    // 指定月の最初の土曜日を見つける
    const monthStart = new Date(year, month - 1, 1);
    const firstSaturday = new Date(monthStart);
    
    // その月の最初の土曜日を見つける
    while (firstSaturday.getDay() !== 6) {
      firstSaturday.setDate(firstSaturday.getDate() + 1);
    }
    
    // 指定された月内週の土曜日を計算
    const targetSaturday = new Date(firstSaturday);
    targetSaturday.setDate(targetSaturday.getDate() + (week - 1) * 7);
    
    const weekStart = new Date(targetSaturday); // 土曜日開始
    const weekEnd = new Date(targetSaturday);
    weekEnd.setDate(weekEnd.getDate() + 6); // 金曜日終了
    
    console.log(`\n=== 6月${week}W (${weekStart.toISOString().split('T')[0]} ～ ${weekEnd.toISOString().split('T')[0]}) ===`);
    
    let newStarted = 0;
    let switching = 0;
    let projectEnded = 0;
    let contractEnded = 0;
    
    console.log('\n--- 稼働開始メンバーチェック ---');
    members.forEach(member => {
      if (member.lastWorkStartDate) {
        const startDate = new Date(member.lastWorkStartDate);
        if (startDate >= weekStart && startDate <= weekEnd) {
          console.log(`稼働開始対象: ${member.name} (${startDate.toISOString().split('T')[0]})`);
          console.log(`  初回稼働開始日: ${member.firstWorkStartDate ? member.firstWorkStartDate.toISOString().split('T')[0] : 'なし'}`);
          console.log(`  最新稼働開始日: ${member.lastWorkStartDate ? member.lastWorkStartDate.toISOString().split('T')[0] : 'なし'}`);
          
          // 新規開始か切り替えかを判定
          const hasPreviousWorkExperience = member.firstWorkStartDate && 
            member.lastWorkStartDate && 
            member.firstWorkStartDate.getTime() !== member.lastWorkStartDate.getTime();
          
          if (hasPreviousWorkExperience) {
            switching++;
            console.log(`  → 切替完了 (過去に稼働経験あり)`);
          } else {
            newStarted++;
            console.log(`  → 新規開始 (初回稼働)`);
          }
        }
      }
    });
    
    console.log('\n--- 稼働終了メンバーチェック ---');
    members.forEach(member => {
      // 案件終了
      if (member.lastWorkEndDate) {
        const endDate = new Date(member.lastWorkEndDate);
        if (endDate >= weekStart && endDate <= weekEnd) {
          projectEnded++;
          console.log(`案件終了: ${member.name} (${endDate.toISOString().split('T')[0]})`);
        }
      }

      // 契約終了
      if (member.contractEndDate) {
        const contractEnd = new Date(member.contractEndDate);
        if (contractEnd >= weekStart && contractEnd <= weekEnd) {
          contractEnded++;
          console.log(`契約終了: ${member.name} (${contractEnd.toISOString().split('T')[0]})`);
        }
      }
    });
    
    console.log('\n--- 稼働中メンバー計算 ---');
    let activeCount = 0;
    members.forEach(member => {
      // その週かその前に稼働開始している
      const hasStarted = member.lastWorkStartDate && new Date(member.lastWorkStartDate) <= weekEnd;
      
      // 案件終了していない、または、案件終了がその週より後
      const projectNotEndedOrEndedAfter = !member.lastWorkEndDate || new Date(member.lastWorkEndDate) > weekEnd;
      
      // 契約終了していない、または、契約終了がその週より後
      const contractNotEndedOrEndedAfter = !member.contractEndDate || new Date(member.contractEndDate) > weekEnd;
      
      const isActive = hasStarted && projectNotEndedOrEndedAfter && contractNotEndedOrEndedAfter;
      
      if (isActive) {
        activeCount++;
        if (activeCount <= 5) { // 最初の5名だけ表示
          console.log(`稼働中: ${member.name} (開始: ${member.lastWorkStartDate ? member.lastWorkStartDate.toISOString().split('T')[0] : 'なし'})`);
        }
      }
    });
    
    console.log(`\n=== 計算結果 ===`);
    console.log(`総稼働者数: ${activeCount}名`);
    console.log(`新規開始人数: ${newStarted}名`);
    console.log(`切替完了人数: ${switching}名`);
    console.log(`案件終了人数: ${projectEnded}名`);
    console.log(`契約終了人数: ${contractEnded}名`);
    console.log(`総開始人数: ${newStarted + switching}名`);
    console.log(`総終了人数: ${projectEnded + contractEnded}名`);
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

debugCalculation(); 