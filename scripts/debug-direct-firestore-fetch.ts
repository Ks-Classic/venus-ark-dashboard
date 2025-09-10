import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeFirebaseAdmin, getAdminDb } from '@/lib/firebase/admin';
import { getWeekDateRange } from '@/lib/date';

async function testFirestoreDataFetch() {
  try {
    console.log('Initializing Firebase Admin...');
    await initializeFirebaseAdmin();
    const db = getAdminDb();
    console.log('Firebase Admin initialized successfully.');

    const year = 2025;
    const month = 5; // 5月

    console.log(`Fetching data for ${year}-${month}...`);

    // 5月の各週のデータを取得してみる
    for (let weekInMonth = 1; weekInMonth <= 5; weekInMonth++) {
      try {
        const { start, end } = getWeekDateRange(year, month, weekInMonth);
        const startDateStr = start.toISOString().split('T')[0];
        const endDateStr = end.toISOString().split('T')[0];

        console.log(`  Week ${weekInMonth}: Querying between ${startDateStr} and ${endDateStr}`);

        const query = db.collection('weekly_reports')
                      .where('reportType', '==', 'recruitment')
                      .where('startDate', '>=', startDateStr)
                      .where('startDate', '<=', endDateStr);

        const snapshot = await query.get();

        if (snapshot.empty) {
          console.log(`    -> No reports found for Week ${weekInMonth}.`);
          continue;
        }

        console.log(`    -> Found ${snapshot.docs.length} reports for Week ${weekInMonth}.`);
        snapshot.docs.forEach(doc => {
          console.log(`      - Doc ID: ${doc.id}`);
          // データ全体をJSONとして出力し、破損がないか目視で確認
          console.log(JSON.stringify(doc.data(), null, 2));
        });

      } catch (weekError) {
        console.error(`  Error fetching data for Week ${weekInMonth}:`, weekError);
      }
    }

  } catch (error) {
    console.error('An unexpected error occurred:', error);
  } finally {
    // Firebaseアプリを終了させるなど、クリーンアップ処理が必要な場合はここに追加
    process.exit(0);
  }
}

testFirestoreDataFetch();
