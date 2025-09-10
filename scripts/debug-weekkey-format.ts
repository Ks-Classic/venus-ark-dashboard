import { initializeFirebaseAdmin, getAdminDb } from '../lib/firebase/admin';

async function debugWeekKeyFormat() {
  try {
    console.log('[DEBUG] Firebase Admin SDK初期化中...');
    initializeFirebaseAdmin();
    const db = getAdminDb();

    console.log('[DEBUG] optimized_weekly_summariesコレクションを確認中...');
    const snapshot = await db.collection('optimized_weekly_summaries').limit(10).get();

    if (snapshot.empty) {
      console.log('[ERROR] optimized_weekly_summariesコレクションにデータがありません');
      return;
    }

    console.log('[DEBUG] 保存されている週キーの例:');
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- Document ID: ${doc.id}`);
      console.log(`  - year: ${data.year}`);
      console.log(`  - weekNumber: ${data.weekNumber}`);
      console.log(`  - startDate: ${data.startDate}`);
      console.log(`  - endDate: ${data.endDate}`);
    });

    // 2025年6月のデータを特に確認
    console.log('\n[DEBUG] 2025年6月のデータを確認:');
    const june2025Query = await db.collection('optimized_weekly_summaries')
      .where('year', '==', 2025)
      .orderBy('weekNumber')
      .get();

    if (june2025Query.empty) {
      console.log('[ERROR] 2025年のデータがありません');
    } else {
      june2025Query.docs.forEach(doc => {
        const data = doc.data();
        if (data.startDate && data.startDate.includes('2025-06')) {
          console.log(`- ${doc.id}: ${data.startDate} ~ ${data.endDate}`);
        }
      });
    }

  } catch (error) {
    console.error('[ERROR] エラーが発生しました:', error);
  }
}

debugWeekKeyFormat(); 