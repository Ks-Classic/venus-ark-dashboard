import { initializeFirebaseAdmin, getAdminDb } from '../lib/firebase/admin';

// Firebase Admin初期化
initializeFirebaseAdmin();

async function debugOptimizedFirestore() {
  try {
    console.log('=== Optimized Weekly Summaries Firestore Debug ===');
    
    const db = getAdminDb();
    
    // 2025-W24のドキュメントを直接確認
    const weekKey = '2025-W24';
    console.log(`\n📄 ${weekKey}ドキュメントを確認中...`);
    
    const doc = await db.collection('optimized_weekly_summaries').doc(weekKey).get();
    
    if (!doc.exists) {
      console.log(`❌ ${weekKey}ドキュメントが存在しません`);
      return;
    }
    
    const data = doc.data();
    if (!data) {
      console.log(`❌ ${weekKey}ドキュメントのデータが空です`);
      return;
    }
    
    console.log(`✅ ${weekKey}ドキュメント発見`);
    
    // データ構造を詳細に確認
    console.log('\n=== データ構造 ===');
    console.log('トップレベルフィールド:', Object.keys(data));
    
    if (data.detailedMetrics) {
      console.log('\n=== detailedMetrics ===');
      console.log('職種:', Object.keys(data.detailedMetrics));
      
      // SNS運用があるか確認
      if (data.detailedMetrics['SNS運用']) {
        console.log('\n=== SNS運用 データ ===');
        const snsData = data.detailedMetrics['SNS運用'];
        console.log('媒体:', Object.keys(snsData));
        
        if (snsData.indeed) {
          console.log('\n=== SNS運用 - indeed ===');
          console.log('フィールド:', Object.keys(snsData.indeed));
          console.log('データ:', JSON.stringify(snsData.indeed, null, 2));
        }
        
        if (snsData.engage) {
          console.log('\n=== SNS運用 - engage ===');
          console.log('フィールド:', Object.keys(snsData.engage));
          console.log('データ:', JSON.stringify(snsData.engage, null, 2));
        }
      } else {
        console.log('❌ SNS運用データが存在しません');
      }
      
      // 動画クリエイターも確認
      if (data.detailedMetrics['動画クリエイター']) {
        console.log('\n=== 動画クリエイター データ ===');
        const videoData = data.detailedMetrics['動画クリエイター'];
        console.log('媒体:', Object.keys(videoData));
        
        if (videoData.indeed) {
          console.log('\n=== 動画クリエイター - indeed ===');
          console.log('フィールド:', Object.keys(videoData.indeed));
          console.log('データ:', JSON.stringify(videoData.indeed, null, 2));
        }
      }
    }
    
    if (data.totals) {
      console.log('\n=== totals 構造 ===');
      console.log('totalsフィールド:', Object.keys(data.totals));
      
      if (data.totals.bySource) {
        console.log('bySourceフィールド:', Object.keys(data.totals.bySource));
      }
    }
    
  } catch (error) {
    console.error('❌ デバッグエラー:', error);
  }
}

// 実行
debugOptimizedFirestore(); 