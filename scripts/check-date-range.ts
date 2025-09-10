import dotenv from 'dotenv';
import { getAdminDb } from '../lib/firebase/admin';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

async function checkDateRange() {
  try {
    console.log('=== 2025年6月の週に該当するデータ確認 ===');
    
    const db = getAdminDb();
    const snapshot = await db.collection('members').get();
    
    console.log(`総メンバー数: ${snapshot.size}件`);
    
    // 2025年6月の範囲を設定
    const june2025Start = new Date('2025-06-01');
    const june2025End = new Date('2025-06-30');
    
    console.log(`確認期間: ${june2025Start.toISOString().split('T')[0]} ～ ${june2025End.toISOString().split('T')[0]}`);
    
    let membersInRange = 0;
    let membersWithWorkStart = 0;
    let membersWithWorkEnd = 0;
    let membersWithContractEnd = 0;
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      let inRange = false;
      
      // 最新稼働開始日をチェック
      if (data.lastWorkStartDate) {
        const startDate = data.lastWorkStartDate.toDate();
        if (startDate >= june2025Start && startDate <= june2025End) {
          console.log(`稼働開始: ${data.name} - ${startDate.toISOString().split('T')[0]}`);
          membersWithWorkStart++;
          inRange = true;
        }
      }
      
      // 最新稼働終了日をチェック
      if (data.lastWorkEndDate) {
        const endDate = data.lastWorkEndDate.toDate();
        if (endDate >= june2025Start && endDate <= june2025End) {
          console.log(`稼働終了: ${data.name} - ${endDate.toISOString().split('T')[0]}`);
          membersWithWorkEnd++;
          inRange = true;
        }
      }
      
      // 契約終了日をチェック
      if (data.contractEndDate) {
        const contractEnd = data.contractEndDate.toDate();
        if (contractEnd >= june2025Start && contractEnd <= june2025End) {
          console.log(`契約終了: ${data.name} - ${contractEnd.toISOString().split('T')[0]}`);
          membersWithContractEnd++;
          inRange = true;
        }
      }
      
      if (inRange) {
        membersInRange++;
      }
    });
    
    console.log(`\n=== 結果 ===`);
    console.log(`2025年6月に該当するメンバー: ${membersInRange}名`);
    console.log(`- 稼働開始: ${membersWithWorkStart}名`);
    console.log(`- 稼働終了: ${membersWithWorkEnd}名`);
    console.log(`- 契約終了: ${membersWithContractEnd}名`);
    
    // 稼働中のメンバー（2025年6月末時点）を計算
    let activeMembers = 0;
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      
      // 2025年6月末時点で稼働している条件
      const hasStarted = data.lastWorkStartDate && data.lastWorkStartDate.toDate() <= june2025End;
      const projectNotEnded = !data.lastWorkEndDate || data.lastWorkEndDate.toDate() > june2025End;
      const contractNotEnded = !data.contractEndDate || data.contractEndDate.toDate() > june2025End;
      
      if (hasStarted && projectNotEnded && contractNotEnded) {
        activeMembers++;
      }
    });
    
    console.log(`2025年6月末時点での稼働者数: ${activeMembers}名`);
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

checkDateRange(); 