import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Firebase Admin SDKの初期化
const serviceAccount = JSON.parse(fs.readFileSync('./venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json', 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: 'venus-ark-aix'
});

const db = getFirestore(app);

async function checkDataCounts() {
  console.log('Firestoreデータ数確認開始...');
  
  try {
    // メンバー数確認
    const membersSnapshot = await db.collection('members').get();
    console.log(`メンバー数: ${membersSnapshot.size}`);
    
    // プロジェクト数確認
    const projectsSnapshot = await db.collection('projects').get();
    console.log(`プロジェクト数: ${projectsSnapshot.size}`);
    
    // メンバー別案件状況数確認
    const memberProjectStatusSnapshot = await db.collection('member_project_status').get();
    console.log(`メンバー別案件状況数: ${memberProjectStatusSnapshot.size}`);
    
    // 週次レポート数確認
    const weeklyReportsSnapshot = await db.collection('weekly_reports').get();
    console.log(`週次レポート数: ${weeklyReportsSnapshot.size}`);
    
    // 重複チェック（メンバー名で）
    const membersByName = new Map<string, number>();
    membersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const name = data.name || 'unnamed';
      membersByName.set(name, (membersByName.get(name) || 0) + 1);
    });
    
    const duplicateNames = Array.from(membersByName.entries())
      .filter(([name, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);
    
    if (duplicateNames.length > 0) {
      console.log('\n⚠️ 重複する名前のメンバー:');
      duplicateNames.forEach(([name, count]) => {
        console.log(`  ${name}: ${count}件`);
      });
    } else {
      console.log('\n✅ メンバー名の重複なし');
    }
    
    // 最近の同期データ確認
    const recentMembers = membersSnapshot.docs
      .filter(doc => {
        const data = doc.data();
        return data.lastSyncedAt && data.lastSyncedAt.toDate() > new Date(Date.now() - 24 * 60 * 60 * 1000);
      });
    
    console.log(`\n📊 過去24時間以内に同期されたメンバー: ${recentMembers.length}件`);
    
  } catch (error) {
    console.error('データ確認エラー:', error);
  }
}

checkDataCounts().then(() => {
  console.log('データ確認完了');
  process.exit(0);
}); 