import { initializeFirebaseAdmin, getAdminDb } from '../lib/firebase/admin';

// Firebase Admin初期化
initializeFirebaseAdmin();

async function debugOptimizedSummaries() {
  try {
    console.log('=== Optimized Weekly Summaries Debug ===');
    
    const db = getAdminDb();
    
    // コレクション全体を確認
    const snapshot = await db.collection('optimized_weekly_summaries')
      .orderBy('year', 'desc')
      .orderBy('weekNumber', 'desc')
      .limit(10)
      .get();
    
    console.log(`\n📊 総ドキュメント数: ${snapshot.size}`);
    
    if (snapshot.empty) {
      console.log('❌ optimized_weekly_summariesコレクションにデータが存在しません');
      return;
    }
    
    console.log('\n=== 最新10件の週次サマリー ===');
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. ${doc.id}`);
      console.log(`   年: ${data.year}, 週: ${data.weekNumber}`);
      console.log(`   期間: ${data.startDate} - ${data.endDate}`);
      
      // totalsの確認
      if (data.totals) {
        console.log(`   総応募数: ${data.totals.applications || 0}`);
        console.log(`   総面接数: ${data.totals.interviews || 0}`);
        console.log(`   総採用数: ${data.totals.hired || 0}`);
      }
      
      // detailedMetricsの職種別データ確認
      if (data.detailedMetrics) {
        const jobCategories = Object.keys(data.detailedMetrics);
        console.log(`   職種数: ${jobCategories.length} (${jobCategories.join(', ')})`);
        
        // SNS運用と動画クリエイターのデータを確認
        ['SNS運用', '動画クリエイター'].forEach(category => {
          if (data.detailedMetrics[category]) {
            const categoryData = data.detailedMetrics[category];
            const indeedData = categoryData.indeed || {};
            const engageData = categoryData.engage || {};
            
            console.log(`   ${category}:`);
            console.log(`     Indeed: 応募${indeedData.applications || 0}, 面接${indeedData.interviews || 0}, 採用${indeedData.hired || 0}`);
            console.log(`     Engage: 応募${engageData.applications || 0}, 面接${engageData.interviews || 0}, 採用${engageData.hired || 0}`);
          }
        });
      }
    });
    
    // 特定の週のデータを詳細確認（2025年第25週）
    console.log('\n=== 2025年第25週の詳細データ ===');
    const week25Doc = await db.collection('optimized_weekly_summaries').doc('2025-W25').get();
    
    if (week25Doc.exists) {
      const week25Data = week25Doc.data();
      console.log('✅ 2025-W25データが存在');
      console.log('詳細構造:', JSON.stringify(week25Data, null, 2));
    } else {
      console.log('❌ 2025-W25データが存在しません');
      
      // 2025年の週データを確認
      console.log('\n=== 2025年の利用可能な週 ===');
      const year2025Snapshot = await db.collection('optimized_weekly_summaries')
        .where('year', '==', 2025)
        .orderBy('weekNumber', 'desc')
        .get();
      
      if (!year2025Snapshot.empty) {
        year2025Snapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`${doc.id}: ${data.year}年第${data.weekNumber}週 (${data.startDate} - ${data.endDate})`);
        });
      } else {
        console.log('❌ 2025年のデータが存在しません');
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

debugOptimizedSummaries(); 