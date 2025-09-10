import { getAdminDb } from '@/lib/firebase/admin';
import { format } from 'date-fns';
import { Member } from '@/lib/types/member';

async function debugEndingProcess() {
  console.log('=== 終了処理・Notion同期問題調査 ===');
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
    
    // 1. 終了処理の問題調査
    console.log('\n=== 1. 終了処理の問題調査 ===');
    
    // 終了日を持つメンバーの確認
    const withEndDate = members.filter(m => m.lastWorkEndDate);
    const withContractEndDate = members.filter(m => m.contractEndDate);
    
    console.log(`最新業務終了日を持つメンバー: ${withEndDate.length}名`);
    console.log(`契約終了日を持つメンバー: ${withContractEndDate.length}名`);
    
    if (withEndDate.length > 0) {
      console.log('\n【最新業務終了日を持つメンバー】');
      withEndDate.slice(0, 10).forEach(member => {
        console.log(`- ${member.name}`);
        console.log(`  終了日: ${format(member.lastWorkEndDate!, 'yyyy-MM-dd')}`);
        console.log(`  開始日: ${member.lastWorkStartDate ? format(member.lastWorkStartDate, 'yyyy-MM-dd') : 'なし'}`);
        console.log(`  ステータス: ${member.status}`);
      });
    }
    
    // 2. Notion同期の問題調査
    console.log('\n=== 2. Notion同期の問題調査 ===');
    
    // 最終同期日時の確認
    const syncedMembers = members.filter(m => m.lastSyncedAt);
    const recentlySynced = members.filter(m => 
      m.lastSyncedAt && m.lastSyncedAt >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    console.log(`同期履歴があるメンバー: ${syncedMembers.length}/${members.length}名`);
    console.log(`24時間以内に同期されたメンバー: ${recentlySynced.length}名`);
    
    if (syncedMembers.length > 0) {
      const sortedBySyncDate = syncedMembers
        .sort((a, b) => (b.lastSyncedAt?.getTime() || 0) - (a.lastSyncedAt?.getTime() || 0));
      
      console.log('\n【最新同期日時順（上位10名）】');
      sortedBySyncDate.slice(0, 10).forEach(member => {
        console.log(`- ${member.name}: ${format(member.lastSyncedAt!, 'yyyy-MM-dd HH:mm:ss')}`);
      });
      
      console.log('\n【最古同期日時順（下位10名）】');
      sortedBySyncDate.slice(-10).reverse().forEach(member => {
        console.log(`- ${member.name}: ${format(member.lastSyncedAt!, 'yyyy-MM-dd HH:mm:ss')}`);
      });
    }
    
    // 3. データ品質の問題調査
    console.log('\n=== 3. データ品質の問題調査 ===');
    
    // 開始日なしメンバーの詳細
    const noStartDate = members.filter(m => !m.lastWorkStartDate);
    console.log(`開始日なしメンバー: ${noStartDate.length}名`);
    
    // 作成日・更新日の確認
    const noCreatedAt = members.filter(m => !m.createdAt);
    const noUpdatedAt = members.filter(m => !m.updatedAt);
    
    console.log(`作成日なし: ${noCreatedAt.length}名`);
    console.log(`更新日なし: ${noUpdatedAt.length}名`);
    
    // 4. ステータス vs 実際のデータ整合性確認
    console.log('\n=== 4. ステータス vs 実際のデータ整合性確認 ===');
    
    // 全員workingステータスだが、実際には異なる状況のメンバーを特定
    const allWorking = members.filter(m => m.status === 'working');
    console.log(`workingステータスメンバー: ${allWorking.length}名`);
    
    // 契約終了日があるのにworkingステータスのメンバー
    const contractEndedButWorking = members.filter(m => 
      m.status === 'working' && m.contractEndDate && m.contractEndDate <= new Date()
    );
    
    console.log(`契約終了済みだがworkingステータス: ${contractEndedButWorking.length}名`);
    
    if (contractEndedButWorking.length > 0) {
      console.log('\n【契約終了済みだがworkingステータスのメンバー】');
      contractEndedButWorking.forEach(member => {
        console.log(`- ${member.name}`);
        console.log(`  契約終了日: ${format(member.contractEndDate!, 'yyyy-MM-dd')}`);
        console.log(`  ステータス: ${member.status}`);
      });
    }
    
    // 5. 稼働履歴の確認
    console.log('\n=== 5. 稼働履歴の確認 ===');
    
    const withWorkHistory = members.filter(m => m.workHistory && m.workHistory.length > 0);
    console.log(`稼働履歴を持つメンバー: ${withWorkHistory.length}名`);
    
    if (withWorkHistory.length > 0) {
      // 稼働履歴から終了情報を持つメンバー
      const withHistoryEndDate = withWorkHistory.filter(m => 
        m.workHistory?.some(h => h.endDate)
      );
      
      console.log(`稼働履歴に終了日があるメンバー: ${withHistoryEndDate.length}名`);
      
      if (withHistoryEndDate.length > 0) {
        console.log('\n【稼働履歴に終了日があるメンバー（上位5名）】');
        withHistoryEndDate.slice(0, 5).forEach(member => {
          const endedHistory = member.workHistory?.filter(h => h.endDate) || [];
          console.log(`- ${member.name}`);
          console.log(`  ステータス: ${member.status}`);
          console.log(`  終了履歴数: ${endedHistory.length}`);
                   endedHistory.slice(0, 2).forEach(h => {
           try {
             const endDateStr = h.endDate ? format(h.endDate, 'yyyy-MM-dd') : '不明';
             console.log(`    - ${h.projectName || '不明'}: ${endDateStr}`);
           } catch (e) {
             console.log(`    - ${h.projectName || '不明'}: 日付エラー`);
           }
         });
        });
      }
    }
    
    // 6. 同期処理の問題特定
    console.log('\n=== 6. 同期処理の問題特定 ===');
    
    // 最近更新されたメンバーの確認
    const recentlyUpdated = members.filter(m => 
      m.updatedAt && m.updatedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    console.log(`7日以内に更新されたメンバー: ${recentlyUpdated.length}名`);
    
    if (recentlyUpdated.length > 0) {
      console.log('\n【最近更新されたメンバー（上位10名）】');
      recentlyUpdated
        .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))
        .slice(0, 10)
        .forEach(member => {
          console.log(`- ${member.name}: ${format(member.updatedAt!, 'yyyy-MM-dd HH:mm:ss')}`);
        });
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

debugEndingProcess().catch(console.error); 