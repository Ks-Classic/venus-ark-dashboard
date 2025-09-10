import dotenv from 'dotenv';
import { getAdminDb } from '../lib/firebase/admin';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

async function debugMemberData() {
  try {
    console.log('=== メンバーデータ確認 ===');
    
    const db = getAdminDb();
    const snapshot = await db.collection('members').limit(10).get();
    
    console.log(`総メンバー数: ${snapshot.size}件`);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n[${index + 1}] メンバー: ${data.name}`);
      console.log(`  ステータス: ${data.status}`);
      console.log(`  初回稼働開始日: ${data.firstWorkStartDate?.toDate?.()?.toISOString()?.split('T')[0] || data.firstWorkStartDate || 'なし'}`);
      console.log(`  最新稼働開始日: ${data.lastWorkStartDate?.toDate?.()?.toISOString()?.split('T')[0] || data.lastWorkStartDate || 'なし'}`);
      console.log(`  最新稼働終了日: ${data.lastWorkEndDate?.toDate?.()?.toISOString()?.split('T')[0] || data.lastWorkEndDate || 'なし'}`);
      console.log(`  契約終了日: ${data.contractEndDate?.toDate?.()?.toISOString()?.split('T')[0] || data.contractEndDate || 'なし'}`);
    });

    // 稼働開始日があるメンバーを確認
    const membersWithWorkStart = await db.collection('members')
      .where('lastWorkStartDate', '!=', null)
      .limit(5)
      .get();
    
    console.log(`\n=== 稼働開始日があるメンバー: ${membersWithWorkStart.size}件 ===`);
    membersWithWorkStart.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`[${index + 1}] ${data.name}: ${data.lastWorkStartDate?.toDate?.()?.toISOString()?.split('T')[0]}`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

debugMemberData(); 