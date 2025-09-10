import dotenv from 'dotenv';
import { getAdminDb } from '../lib/firebase/admin';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

async function debugDataFields() {
  try {
    console.log('=== Notionデータフィールド詳細確認 ===');
    
    const db = getAdminDb();
    const snapshot = await db.collection('members').limit(20).get();
    
    console.log(`確認対象メンバー数: ${snapshot.size}件`);
    
    // 各フィールドの状況を確認
    let hasFirstWorkStartDate = 0;
    let hasLastWorkStartDate = 0;
    let hasLastWorkEndDate = 0;
    let hasContractEndDate = 0;
    let hasWorkHistory = 0;
    
    console.log('\n=== メンバー詳細データ ===');
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      
      if (index < 10) { // 最初の10名の詳細を表示
        console.log(`\n[${index + 1}] ${data.name}`);
        console.log(`  ステータス: ${data.status}`);
        console.log(`  初回稼働開始日: ${data.firstWorkStartDate ? data.firstWorkStartDate.toDate().toISOString().split('T')[0] : 'なし'}`);
        console.log(`  最新稼働開始日: ${data.lastWorkStartDate ? data.lastWorkStartDate.toDate().toISOString().split('T')[0] : 'なし'}`);
        console.log(`  最新稼働終了日: ${data.lastWorkEndDate ? data.lastWorkEndDate.toDate().toISOString().split('T')[0] : 'なし'}`);
        console.log(`  契約終了日: ${data.contractEndDate ? data.contractEndDate.toDate().toISOString().split('T')[0] : 'なし'}`);
        console.log(`  稼働履歴: ${data.workHistory ? `${data.workHistory.length}件` : 'なし'}`);
        
        // 稼働履歴の詳細（あれば）
        if (data.workHistory && data.workHistory.length > 0) {
          console.log(`  稼働履歴詳細:`);
          data.workHistory.slice(0, 3).forEach((history: any, historyIndex: number) => {
            console.log(`    [${historyIndex + 1}] プロジェクト: ${history.projectName || '不明'}`);
            console.log(`        ステータス: ${history.status || '不明'}`);
            console.log(`        開始日: ${history.startDate || 'なし'}`);
            console.log(`        終了日: ${history.endDate || 'なし'}`);
          });
        }
      }
      
      // 統計用カウント
      if (data.firstWorkStartDate) hasFirstWorkStartDate++;
      if (data.lastWorkStartDate) hasLastWorkStartDate++;
      if (data.lastWorkEndDate) hasLastWorkEndDate++;
      if (data.contractEndDate) hasContractEndDate++;
      if (data.workHistory && data.workHistory.length > 0) hasWorkHistory++;
    });
    
    console.log('\n=== フィールド存在統計 ===');
    console.log(`初回稼働開始日あり: ${hasFirstWorkStartDate}/${snapshot.size}件`);
    console.log(`最新稼働開始日あり: ${hasLastWorkStartDate}/${snapshot.size}件`);
    console.log(`最新稼働終了日あり: ${hasLastWorkEndDate}/${snapshot.size}件`);
    console.log(`契約終了日あり: ${hasContractEndDate}/${snapshot.size}件`);
    console.log(`稼働履歴あり: ${hasWorkHistory}/${snapshot.size}件`);
    
    // 計算式の確認
    console.log('\n=== 現在の計算式確認 ===');
    console.log('1. 総稼働者数:');
    console.log('   - その週かその前に稼働開始している (lastWorkStartDate <= 週終了日)');
    console.log('   - 案件終了していない、または終了がその週より後 (!lastWorkEndDate || lastWorkEndDate > 週終了日)');
    console.log('   - 契約終了していない、または終了がその週より後 (!contractEndDate || contractEndDate > 週終了日)');
    
    console.log('\n2. 新規開始人数:');
    console.log('   - その週に稼働開始 (lastWorkStartDate が週範囲内)');
    console.log('   - 初回稼働開始日 = 最新稼働開始日 (firstWorkStartDate === lastWorkStartDate)');
    
    console.log('\n3. 切替完了人数:');
    console.log('   - その週に稼働開始 (lastWorkStartDate が週範囲内)');
    console.log('   - 過去に稼働経験あり (firstWorkStartDate !== lastWorkStartDate)');
    
    console.log('\n4. 案件終了人数:');
    console.log('   - その週に案件終了 (lastWorkEndDate が週範囲内)');
    
    console.log('\n5. 契約終了人数:');
    console.log('   - その週に契約終了 (contractEndDate が週範囲内)');
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

debugDataFields(); 