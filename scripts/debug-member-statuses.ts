import * as dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { getAdminDb } from '../lib/firebase/admin';

async function debugMemberStatuses() {
  try {
    console.log('環境変数確認:');
    console.log('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '設定済み' : '未設定');
    console.log('- FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '設定済み' : '未設定');
    console.log('- FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '設定済み' : '未設定');
    console.log('');
    
    console.log('Firestoreからメンバーデータを取得中...');
    
    const db = getAdminDb();
    const membersSnapshot = await db.collection('members').get();
    
    console.log(`取得メンバー数: ${membersSnapshot.size}`);
    
    // ステータス分布を集計
    const statusCounts: Record<string, number> = {};
    const targetStatuses = [
      'job_matching',
      'interview_prep', 
      'interview',
      'result_waiting',
      'hired'
    ];
    
    const membersWithTargetStatus: any[] = [];
    
    membersSnapshot.forEach(doc => {
      const data = doc.data();
      const status = data.status;
      
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      if (targetStatuses.includes(status)) {
        membersWithTargetStatus.push({
          id: doc.id,
          name: data.name,
          status: status,
          lastWorkStartDate: data.lastWorkStartDate,
          lastWorkEndDate: data.lastWorkEndDate
        });
      }
    });
    
    console.log('\n=== ステータス分布 ===');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`${status}: ${count}人`);
    });
    
    console.log('\n=== 対象ステータス (新規追加) ===');
    targetStatuses.forEach(status => {
      const count = statusCounts[status] || 0;
      console.log(`${status}: ${count}人`);
    });
    
    if (membersWithTargetStatus.length > 0) {
      console.log('\n=== 対象ステータスを持つメンバー詳細 ===');
      membersWithTargetStatus.forEach((member, index) => {
        console.log(`${index + 1}. ${member.name} - ステータス: ${member.status}`);
        console.log(`   lastWorkStartDate: ${member.lastWorkStartDate?.toDate?.()?.toISOString() || 'なし'}`);
        console.log(`   lastWorkEndDate: ${member.lastWorkEndDate?.toDate?.()?.toISOString() || 'なし'}`);
      });
    } else {
      console.log('\n対象ステータスを持つメンバーはいません。');
    }
    
    // 全ステータス一覧
    const uniqueStatuses = [...new Set(Object.keys(statusCounts))];
    console.log('\n=== 全ステータス一覧 ===');
    uniqueStatuses.forEach(status => {
      console.log(`- ${status}`);
    });
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// スクリプト実行
debugMemberStatuses().then(() => {
  console.log('\n処理完了');
  process.exit(0);
}).catch(error => {
  console.error('スクリプト実行エラー:', error);
  process.exit(1);
}); 