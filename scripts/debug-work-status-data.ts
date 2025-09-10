import { getMembersWithWorkHistory } from '@/lib/firestore/members';
import { format } from 'date-fns';

async function debugWorkStatusData() {
  console.log('=== 稼働状況データ確認 ===');
  
  try {
    const members = await getMembersWithWorkHistory();
    console.log(`\n取得したメンバー数: ${members.length}`);
    
    // 最近の稼働開始者を確認
    const recentStarters = members.filter(member => 
      member.lastWorkStartDate && 
      member.lastWorkStartDate >= new Date('2025-05-01')
    ).sort((a, b) => 
      (b.lastWorkStartDate?.getTime() || 0) - (a.lastWorkStartDate?.getTime() || 0)
    );
    
    console.log(`\n=== 2025年5月以降の稼働開始者 (${recentStarters.length}名) ===`);
    recentStarters.slice(0, 10).forEach(member => {
      console.log(`${member.name}:`);
      console.log(`  開始日: ${member.lastWorkStartDate ? format(member.lastWorkStartDate, 'yyyy-MM-dd') : 'N/A'}`);
      console.log(`  終了日: ${member.lastWorkEndDate ? format(member.lastWorkEndDate, 'yyyy-MM-dd') : 'N/A'}`);
      console.log(`  契約終了日: ${member.contractEndDate ? format(member.contractEndDate, 'yyyy-MM-dd') : 'N/A'}`);
      console.log(`  ステータス: ${member.status}`);
      console.log(`  カウンセリング日: ${member.firstCounselingDate ? format(member.firstCounselingDate, 'yyyy-MM-dd') : 'N/A'}`);
      
      // 切り替え判定の確認
      if (member.lastWorkEndDate && member.lastWorkStartDate) {
        const daysDiff = Math.floor((member.lastWorkStartDate.getTime() - member.lastWorkEndDate.getTime()) / (1000 * 60 * 60 * 24));
        const isSwitching = member.lastWorkEndDate < member.lastWorkStartDate && daysDiff <= 180;
        console.log(`  切り替え判定: ${isSwitching ? 'YES' : 'NO'} (差分: ${daysDiff}日)`);
      }
      console.log('');
    });
    
    // 最近の終了者を確認
    const recentEnders = members.filter(member => 
      member.lastWorkEndDate && 
      member.lastWorkEndDate >= new Date('2025-05-01')
    ).sort((a, b) => 
      (b.lastWorkEndDate?.getTime() || 0) - (a.lastWorkEndDate?.getTime() || 0)
    );
    
    console.log(`\n=== 2025年5月以降の終了者 (${recentEnders.length}名) ===`);
    recentEnders.slice(0, 10).forEach(member => {
      console.log(`${member.name}:`);
      console.log(`  終了日: ${member.lastWorkEndDate ? format(member.lastWorkEndDate, 'yyyy-MM-dd') : 'N/A'}`);
      console.log(`  契約終了日: ${member.contractEndDate ? format(member.contractEndDate, 'yyyy-MM-dd') : 'N/A'}`);
      console.log(`  ステータス: ${member.status}`);
      console.log('');
    });
    
    // ステータス分布
    const statusCounts: Record<string, number> = {};
    members.forEach(member => {
      statusCounts[member.status] = (statusCounts[member.status] || 0) + 1;
    });
    
    console.log('\n=== ステータス分布 ===');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`${status}: ${count}名`);
    });

  } catch (error) {
    console.error('エラー:', error);
  }
}

// 実行
debugWorkStatusData(); 