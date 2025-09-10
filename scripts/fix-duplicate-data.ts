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

async function removeDuplicateMembers() {
  console.log('メンバーデータの重複チェック開始...');
  
  const membersRef = db.collection('members');
  const snapshot = await membersRef.get();
  
  const membersByName = new Map<string, any[]>();
  const membersByEmail = new Map<string, any[]>();
  
  // 名前とメールアドレスで重複をチェック
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const name = data.name || data.normalizedName;
    const email = data.email;
    
    if (name) {
      if (!membersByName.has(name)) {
        membersByName.set(name, []);
      }
      membersByName.get(name)!.push({ id: doc.id, ...data });
    }
    
    if (email) {
      if (!membersByEmail.has(email)) {
        membersByEmail.set(email, []);
      }
      membersByEmail.get(email)!.push({ id: doc.id, ...data });
    }
  });
  
  console.log(`総メンバー数: ${snapshot.docs.length}`);
  
  // 名前による重複をチェック
  let duplicatesByName = 0;
  for (const [name, members] of membersByName) {
    if (members.length > 1) {
      console.log(`重複メンバー (名前: ${name}): ${members.length}件`);
      duplicatesByName++;
      
      // 最新のupdatedAtを持つメンバーを残し、他を削除
      const sortedMembers = members.sort((a, b) => {
        const aTime = a.updatedAt?.toDate?.() || new Date(0);
        const bTime = b.updatedAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      const keepMember = sortedMembers[0];
      const duplicateMembers = sortedMembers.slice(1);
      
      console.log(`  保持: ${keepMember.id} (${keepMember.updatedAt?.toDate?.()})`);
      
      for (const duplicate of duplicateMembers) {
        console.log(`  削除: ${duplicate.id} (${duplicate.updatedAt?.toDate?.()})`);
        await membersRef.doc(duplicate.id).delete();
      }
    }
  }
  
  // メールアドレスによる重複をチェック
  let duplicatesByEmail = 0;
  for (const [email, members] of membersByEmail) {
    if (members.length > 1) {
      console.log(`重複メンバー (メール: ${email}): ${members.length}件`);
      duplicatesByEmail++;
      
      // 最新のupdatedAtを持つメンバーを残し、他を削除
      const sortedMembers = members.sort((a, b) => {
        const aTime = a.updatedAt?.toDate?.() || new Date(0);
        const bTime = b.updatedAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      const keepMember = sortedMembers[0];
      const duplicateMembers = sortedMembers.slice(1);
      
      console.log(`  保持: ${keepMember.id} (${keepMember.updatedAt?.toDate?.()})`);
      
      for (const duplicate of duplicateMembers) {
        console.log(`  削除: ${duplicate.id} (${duplicate.updatedAt?.toDate?.()})`);
        await membersRef.doc(duplicate.id).delete();
      }
    }
  }
  
  console.log(`重複削除完了: 名前重複=${duplicatesByName}, メール重複=${duplicatesByEmail}`);
}

async function removeOldWeeklyReports() {
  console.log('古い週次レポートの削除開始...');
  
  const reportsRef = db.collection('weekly_reports');
  const snapshot = await reportsRef.get();
  
  console.log(`週次レポート総数: ${snapshot.docs.length}`);
  
  // 今日から1週間以内のレポートのみ保持
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  let deletedCount = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate?.() || new Date(0);
    
    if (createdAt < oneWeekAgo) {
      console.log(`削除: ${doc.id} (作成日: ${createdAt})`);
      await reportsRef.doc(doc.id).delete();
      deletedCount++;
    }
  }
  
  console.log(`古い週次レポート削除完了: ${deletedCount}件`);
}

async function main() {
  try {
    await removeDuplicateMembers();
    await removeOldWeeklyReports();
    console.log('データクリーンアップ完了');
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    process.exit(0);
  }
}

main(); 