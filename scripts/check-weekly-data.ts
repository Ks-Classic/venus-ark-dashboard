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

async function checkWeeklyData() {
  try {
    console.log('=== 2025年6月の週別データ確認 ===');
    
    const db = getAdminDb();
    const snapshot = await db.collection('members').get();
    
    // 2025年6月の各週を計算
    const year = 2025;
    const month = 6;
    
    // 指定月の最初の土曜日を見つける
    const monthStart = new Date(year, month - 1, 1);
    const firstSaturday = new Date(monthStart);
    
    // その月の最初の土曜日を見つける
    while (firstSaturday.getDay() !== 6) {
      firstSaturday.setDate(firstSaturday.getDate() + 1);
    }
    
    console.log(`6月の最初の土曜日: ${firstSaturday.toISOString().split('T')[0]}`);
    
    // 各週のデータを確認
    for (let weekNum = 1; weekNum <= 4; weekNum++) {
      const targetSaturday = new Date(firstSaturday);
      targetSaturday.setDate(targetSaturday.getDate() + (weekNum - 1) * 7);
      
      const weekStart = new Date(targetSaturday); // 土曜日開始
      const weekEnd = new Date(targetSaturday);
      weekEnd.setDate(weekEnd.getDate() + 6); // 金曜日終了
      
      console.log(`\n=== 6月${weekNum}W (${weekStart.toISOString().split('T')[0]} ～ ${weekEnd.toISOString().split('T')[0]}) ===`);
      
      let weekStarted = 0;
      let weekEnded = 0;
      let weekActive = 0;
      
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        
        // 稼働開始チェック
        if (data.lastWorkStartDate) {
          const startDate = data.lastWorkStartDate.toDate();
          if (startDate >= weekStart && startDate <= weekEnd) {
            console.log(`  稼働開始: ${data.name} (${startDate.toISOString().split('T')[0]})`);
            weekStarted++;
          }
        }
        
        // 稼働終了チェック
        if (data.lastWorkEndDate) {
          const endDate = data.lastWorkEndDate.toDate();
          if (endDate >= weekStart && endDate <= weekEnd) {
            console.log(`  稼働終了: ${data.name} (${endDate.toISOString().split('T')[0]})`);
            weekEnded++;
          }
        }
        
        // その週時点での稼働中チェック
        const hasStarted = data.lastWorkStartDate && data.lastWorkStartDate.toDate() <= weekEnd;
        const projectNotEnded = !data.lastWorkEndDate || data.lastWorkEndDate.toDate() > weekEnd;
        const contractNotEnded = !data.contractEndDate || data.contractEndDate.toDate() > weekEnd;
        
        if (hasStarted && projectNotEnded && contractNotEnded) {
          weekActive++;
        }
      });
      
      console.log(`  稼働開始: ${weekStarted}名`);
      console.log(`  稼働終了: ${weekEnded}名`);
      console.log(`  総稼働者: ${weekActive}名`);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

checkWeeklyData(); 