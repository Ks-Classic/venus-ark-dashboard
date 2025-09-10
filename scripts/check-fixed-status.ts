import { getAdminDb } from '@/lib/firebase/admin';
import { Member } from '@/lib/types/member';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { isWorkingAtDate } from '@/lib/analytics/enhanced-work-status-aggregation';

async function checkFixedStatus() {
  console.log('=== 修正後ステータス確認 ===');
  console.log(`実行時刻: ${new Date().toISOString()}`);
  
  try {
    const adminDb = getAdminDb();
    const membersSnapshot = await adminDb.collection('members').get();
    
    const members: Member[] = membersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        applicationDate: data.applicationDate?.toDate(),
        hireDate: data.hireDate?.toDate(),
        firstWorkStartDate: data.firstWorkStartDate?.toDate(),
        lastWorkStartDate: data.lastWorkStartDate?.toDate(),
        firstCounselingDate: data.firstCounselingDate?.toDate(),
        lastWorkEndDate: data.lastWorkEndDate?.toDate(),
        contractEndDate: data.contractEndDate?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        lastSyncedAt: data.lastSyncedAt?.toDate(),
      } as Member;
    });

    console.log(`\n取得したメンバー総数: ${members.length}`);
    
    // ステータス別集計
    const statusCount = members.reduce((acc, member) => {
      acc[member.status] = (acc[member.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n=== ステータス別集計 ===');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`${status}: ${count}名`);
    });
    
    // 6月3週（6月14日-20日）の稼働者数計算
    const june2025Week3Start = new Date(2025, 5, 14); // 6月14日
    const june2025Week3End = new Date(2025, 5, 20);   // 6月20日
    
    console.log(`\n=== 6月3週（${format(june2025Week3Start, 'yyyy-MM-dd')} - ${format(june2025Week3End, 'yyyy-MM-dd')}）稼働者数計算 ===`);
    
    // 修正前の計算（ステータスベース）
    const workingStatusMembers = members.filter(m => 
      m.status === 'working' || m.status === 'learning_started'
    );
    
    console.log(`workingまたはlearning_startedステータス: ${workingStatusMembers.length}名`);
    
    // 修正後の計算（日付ベース）
    const workingAtJuneWeek3 = members.filter(member => 
      isWorkingAtDate(member, june2025Week3Start)
    );
    
    console.log(`6月3週時点で稼働中（日付ベース）: ${workingAtJuneWeek3.length}名`);
    
    // 詳細分析
    console.log('\n=== 詳細分析 ===');
    
    // workingステータスだが日付ベースでは非稼働のメンバー
    const workingButNotActive = members.filter(member => 
      member.status === 'working' && !isWorkingAtDate(member, june2025Week3Start)
    );
    
    console.log(`workingステータスだが6月3週時点で非稼働: ${workingButNotActive.length}名`);
    
    if (workingButNotActive.length > 0) {
      console.log('\n【workingステータスだが非稼働のメンバー（上位10名）】');
      workingButNotActive.slice(0, 10).forEach(member => {
        console.log(`- ${member.name}`);
        console.log(`  ステータス: ${member.status}`);
        console.log(`  開始日: ${member.lastWorkStartDate ? format(member.lastWorkStartDate, 'yyyy-MM-dd') : 'なし'}`);
        console.log(`  終了日: ${member.lastWorkEndDate ? format(member.lastWorkEndDate, 'yyyy-MM-dd') : 'なし'}`);
      });
    }
    
    // 開始日なしメンバーの確認
    const noStartDate = members.filter(m => !m.lastWorkStartDate);
    console.log(`\n開始日なしメンバー: ${noStartDate.length}名`);
    
    if (noStartDate.length > 0) {
      const workingNoStartDate = noStartDate.filter(m => m.status === 'working');
      console.log(`うちworkingステータス: ${workingNoStartDate.length}名`);
      
      if (workingNoStartDate.length > 0) {
        console.log('\n【workingステータスで開始日なしメンバー（上位10名）】');
        workingNoStartDate.slice(0, 10).forEach(member => {
          console.log(`- ${member.name} (ステータス: ${member.status})`);
        });
      }
    }
    
    // 期待値52名との比較
    const expectedCount = 52;
    const actualCount = workingAtJuneWeek3.length;
    const difference = actualCount - expectedCount;
    
    console.log('\n=== 期待値との比較 ===');
    console.log(`期待値: ${expectedCount}名`);
    console.log(`実際値: ${actualCount}名`);
    console.log(`差分: ${difference > 0 ? '+' : ''}${difference}名`);
    
    if (difference > 0) {
      console.log(`\n差分の要因分析が必要です。`);
      console.log(`考えられる要因:`);
      console.log(`1. 新規稼働者の追加`);
      console.log(`2. 開始日なしメンバーの処理`);
      console.log(`3. 期待値の算出基準の相違`);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

checkFixedStatus().catch(console.error); 