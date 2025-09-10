const admin = require('firebase-admin');

// Firebase Admin SDKの初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert('./venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json'),
    databaseURL: 'https://venus-ark-aix-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

/**
 * 自然言語風のクエリ関数
 * 例: "2025年第23週のSNS運用の応募データ"
 */
async function naturalLanguageQuery(query) {
  console.log(`🔍 クエリ: "${query}"`);
  
  // 週次サマリーの検索
  if (query.includes('週') && query.includes('2025')) {
    const weekMatch = query.match(/第(\d+)週/);
    if (weekMatch) {
      const weekNumber = weekMatch[1];
      const docId = `2025-W${weekNumber.padStart(2, '0')}`;
      
      const doc = await db.collection('optimized_weekly_summaries').doc(docId).get();
      if (doc.exists) {
        const data = doc.data();
        console.log(`📊 ${docId}のデータ:`);
        
        if (query.includes('SNS運用')) {
          console.log('SNS運用データ:', JSON.stringify(data.detailedMetrics?.['SNS運用'], null, 2));
        } else {
          console.log('全体データ:', JSON.stringify(data.totals, null, 2));
        }
      } else {
        console.log(`❌ ${docId}のデータが見つかりません`);
      }
    }
  }
  
  // 応募データの検索
  if (query.includes('応募') && query.includes('2025')) {
    const applications = await db.collection('applications')
      .where('applicationDate', '>=', '2025-01-01')
      .where('applicationDate', '<=', '2025-12-31')
      .orderBy('applicationDate', 'desc')
      .limit(5)
      .get();
      
    console.log(`📋 2025年の応募データ（最新5件）:`);
    applications.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  ${index + 1}. ${data.applicantName} - ${data.jobCategory} (${data.applicationDate})`);
    });
  }
}

/**
 * SQLライクなクエリ関数
 */
async function sqlLikeQuery(collection, conditions = {}, orderBy = null, limit = null) {
  console.log(`🗃️ SQLライククエリ: ${collection}`);
  
  let query = db.collection(collection);
  
  // WHERE条件を追加
  Object.entries(conditions).forEach(([field, condition]) => {
    if (typeof condition === 'object' && condition.operator) {
      query = query.where(field, condition.operator, condition.value);
    } else {
      query = query.where(field, '==', condition);
    }
  });
  
  // ORDER BY
  if (orderBy) {
    query = query.orderBy(orderBy.field, orderBy.direction || 'asc');
  }
  
  // LIMIT
  if (limit) {
    query = query.limit(limit);
  }
  
  const snapshot = await query.get();
  const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  console.log(`📊 結果: ${results.length}件`);
  return results;
}

/**
 * 集計クエリ関数
 */
async function aggregateQuery(collection, groupBy, aggregateField = null) {
  console.log(`📈 集計クエリ: ${collection} GROUP BY ${groupBy}`);
  
  const snapshot = await db.collection(collection).get();
  const results = {};
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const groupValue = data[groupBy];
    
    if (!results[groupValue]) {
      results[groupValue] = { count: 0, items: [] };
    }
    
    results[groupValue].count++;
    results[groupValue].items.push(data);
    
    if (aggregateField && data[aggregateField]) {
      if (!results[groupValue].sum) results[groupValue].sum = 0;
      results[groupValue].sum += data[aggregateField];
    }
  });
  
  console.log('集計結果:', JSON.stringify(results, null, 2));
  return results;
}

/**
 * データ検索の実行例
 */
async function runExamples() {
  console.log('=== Firestore データ検索例 ===\n');
  
  // 1. 自然言語風クエリ
  await naturalLanguageQuery('2025年第23週のSNS運用の応募データ');
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 2. SQLライククエリ例
  console.log('📊 SQLライククエリ例:');
  
  // 最近の応募データ
  const recentApplications = await sqlLikeQuery(
    'applications',
    {
      applicationDate: { operator: '>=', value: '2025-06-01' },
      jobCategory: 'SNS運用'
    },
    { field: 'applicationDate', direction: 'desc' },
    3
  );
  
  recentApplications.forEach((app, index) => {
    console.log(`  ${index + 1}. ${app.applicantName} - ${app.jobCategory} (${app.applicationDate})`);
  });
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 3. 集計クエリ例
  await aggregateQuery('applications', 'jobCategory');
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 4. 週次データの検索
  console.log('📅 週次データ検索:');
  const weeklyDocs = await db.collection('optimized_weekly_summaries')
    .where('year', '==', 2025)
    .where('weekNumber', '>=', 20)
    .orderBy('weekNumber', 'desc')
    .limit(4)
    .get();
    
  weeklyDocs.docs.forEach(doc => {
    const data = doc.data();
    const snsData = data.detailedMetrics?.['SNS運用'];
    console.log(`  ${doc.id}: SNS運用応募 ${snsData?.total?.applications || 0}件`);
  });
}

// コマンドライン引数での実行
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // デフォルトで例を実行
    runExamples().then(() => process.exit(0));
  } else if (args[0] === 'query') {
    // 自然言語クエリ
    const query = args.slice(1).join(' ');
    naturalLanguageQuery(query).then(() => process.exit(0));
  } else if (args[0] === 'sql') {
    // SQLライククエリ（簡単な例）
    const collection = args[1];
    const field = args[2];
    const value = args[3];
    
    if (collection && field && value) {
      sqlLikeQuery(collection, { [field]: value }, null, 10)
        .then(results => {
          console.log(`結果: ${results.length}件`);
          results.forEach((item, index) => {
            console.log(`${index + 1}.`, item);
          });
        })
        .then(() => process.exit(0));
    } else {
      console.log('使用法: node scripts/query-firestore-data.js sql <collection> <field> <value>');
      process.exit(1);
    }
  } else {
    console.log(`
使用法:
  node scripts/query-firestore-data.js                    # 例を実行
  node scripts/query-firestore-data.js query <自然言語>    # 自然言語クエリ
  node scripts/query-firestore-data.js sql <collection> <field> <value>  # SQLライククエリ
    `);
    process.exit(1);
  }
}

module.exports = {
  naturalLanguageQuery,
  sqlLikeQuery,
  aggregateQuery
}; 