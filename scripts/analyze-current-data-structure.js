const admin = require('firebase-admin');
const serviceAccount = require('../venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'venus-ark-aix'
});

const db = admin.firestore();

async function analyzeDataStructure() {
  console.log('=== Firestore データ構造分析 ===');
  
  // 1. optimized_weekly_summariesの構造確認
  console.log('\n📊 optimized_weekly_summaries コレクション分析:');
  const optimizedDocs = await db.collection('optimized_weekly_summaries').limit(3).get();
  
  optimizedDocs.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`\n--- ドキュメント ${index + 1}: ${doc.id} ---`);
    console.log('基本情報:', {
      year: data.year,
      weekNumber: data.weekNumber,
      startDate: data.startDate,
      endDate: data.endDate
    });
    
    console.log('データ構造:');
    console.log('- totals:', Object.keys(data.totals || {}));
    console.log('- detailedMetrics:', Object.keys(data.detailedMetrics || {}));
    
    if (data.detailedMetrics && data.detailedMetrics['SNS運用']) {
      console.log('- SNS運用データ:', Object.keys(data.detailedMetrics['SNS運用']));
    }
  });
  
  // 2. 元のapplicationsコレクションの構造確認
  console.log('\n📋 applications コレクション分析:');
  const appDocs = await db.collection('applications').limit(3).get();
  
  appDocs.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`\n--- アプリケーション ${index + 1}: ${doc.id} ---`);
    console.log('基本情報:', {
      応募日: data.応募日,
      職種: data.職種,
      媒体: data.媒体,
      現状ステータス: data.現状ステータス
    });
  });
  
  // 3. 週の定義の問題を確認
  console.log('\n📅 週定義の問題分析:');
  
  // 2025年6月7日（土）の報告で必要な期間
  const reportDate = new Date('2025-06-07'); // 土曜日
  const periodStart = new Date('2025-05-31'); // 金曜日
  const periodEnd = new Date('2025-06-06'); // 土曜日
  
  console.log('必要な集計期間:');
  console.log(`- 報告日: ${reportDate.toLocaleDateString('ja-JP')} (${reportDate.toLocaleDateString('ja-JP', {weekday: 'long'})})`);
  console.log(`- 集計開始: ${periodStart.toLocaleDateString('ja-JP')} (${periodStart.toLocaleDateString('ja-JP', {weekday: 'long'})})`);
  console.log(`- 集計終了: ${periodEnd.toLocaleDateString('ja-JP')} (${periodEnd.toLocaleDateString('ja-JP', {weekday: 'long'})})`);
  
  // 現在のISO週番号との比較
  const isoWeek = getISOWeek(reportDate);
  console.log(`\n現在のISO週番号: ${reportDate.getFullYear()}年第${isoWeek}週`);
  console.log('これは月曜始まりの週番号で、業務要件と合わない');
  
  // 4. 必要な修正内容の提案
  console.log('\n🔧 必要な修正内容:');
  console.log('1. 週の定義を「金曜～土曜」ベースに変更');
  console.log('2. ドキュメントIDを「YYYY-M月W週」形式に変更');
  console.log('3. 集計ロジックを土曜日報告ベースに修正');
  console.log('4. 既存データの再計算と移行');
  
  process.exit(0);
}

// ISO週番号を取得する関数
function getISOWeek(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

analyzeDataStructure().catch(console.error); 