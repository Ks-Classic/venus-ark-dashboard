import { getAdminDb } from '@/lib/firebase/admin';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function debugApiData() {
  console.log('=== API データ確認 ===');
  
  try {
    const db = getAdminDb();
    const membersRef = collection(db, 'members');
    const q = query(membersRef, limit(5));
    const snapshot = await getDocs(q);
    
    console.log(`\n取得したメンバー数: ${snapshot.docs.length}`);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- メンバー ${index + 1}: ${data.name} ---`);
      console.log('ID:', doc.id);
      console.log('name:', data.name);
      console.log('status:', data.status);
      console.log('firstWorkStartDate:', data.firstWorkStartDate?.toDate?.() || data.firstWorkStartDate);
      console.log('lastWorkStartDate:', data.lastWorkStartDate?.toDate?.() || data.lastWorkStartDate);
      console.log('lastWorkEndDate:', data.lastWorkEndDate?.toDate?.() || data.lastWorkEndDate);
      console.log('contractEndDate:', data.contractEndDate?.toDate?.() || data.contractEndDate);
      console.log('firstCounselingDate:', data.firstCounselingDate?.toDate?.() || data.firstCounselingDate);
      
      // 全フィールドを表示
      console.log('全フィールド:', Object.keys(data));
    });

    // ステータスの種類を確認
    const allSnapshot = await getDocs(collection(db, 'members'));
    const statusCounts: Record<string, number> = {};
    
    allSnapshot.docs.forEach(doc => {
      const status = doc.data().status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
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
debugApiData(); 