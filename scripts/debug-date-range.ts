import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { format } from 'date-fns';

// Firebase Admin SDK初期化
if (!getApps().length) {
  try {
    const serviceAccount = require('./venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json');
    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'venus-ark-aix'
    });
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    process.exit(1);
  }
}

const db = getFirestore();

async function investigateDateRange() {
  console.log('🔍 実際のデータの日付範囲調査\n');

  try {
    const allApplicationsSnapshot = await db.collection('applications').get();
    console.log(`総データ数: ${allApplicationsSnapshot.size}件\n`);

    const dates: Date[] = [];
    const dateParsingErrors: any[] = [];

    allApplicationsSnapshot.forEach(doc => {
      const data = doc.data();
      let applicationDate;
      
      try {
        if (data.applicationDate?.toDate) {
          applicationDate = data.applicationDate.toDate();
        } else if (data.applicationDate?.seconds) {
          applicationDate = new Date(data.applicationDate.seconds * 1000);
        } else if (typeof data.applicationDate === 'string') {
          applicationDate = new Date(data.applicationDate);
        } else {
          dateParsingErrors.push({ id: doc.id, applicationDate: data.applicationDate });
          return;
        }
        
        if (!isNaN(applicationDate.getTime())) {
          dates.push(applicationDate);
        } else {
          dateParsingErrors.push({ id: doc.id, applicationDate: data.applicationDate });
        }
      } catch (error) {
        dateParsingErrors.push({ id: doc.id, applicationDate: data.applicationDate, error });
      }
    });

    console.log(`有効な日付データ: ${dates.length}件`);
    console.log(`日付パースエラー: ${dateParsingErrors.length}件\n`);

    if (dates.length > 0) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      
      console.log('📅 日付範囲:');
      console.log(`最古の応募日: ${format(minDate, 'yyyy-MM-dd')}`);
      console.log(`最新の応募日: ${format(maxDate, 'yyyy-MM-dd')}\n`);

      // 月別分布
      const monthCounts: Record<string, number> = {};
      dates.forEach(date => {
        const monthKey = format(date, 'yyyy-MM');
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      });

      console.log('📊 月別分布（上位10件）:');
      Object.entries(monthCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([month, count]) => {
          console.log(`  ${month}: ${count}件`);
        });
      console.log();

      // 2024年12月のデータ確認
      const december2024 = dates.filter(date => {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return year === 2024 && month === 12;
      });

      console.log(`2024年12月のデータ: ${december2024.length}件`);

      if (december2024.length > 0) {
        console.log('2024年12月の日付分布:');
        const daysCounts: Record<string, number> = {};
        december2024.forEach(date => {
          const dayKey = format(date, 'yyyy-MM-dd');
          daysCounts[dayKey] = (daysCounts[dayKey] || 0) + 1;
        });

        Object.entries(daysCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(0, 10)
          .forEach(([day, count]) => {
            console.log(`  ${day}: ${count}件`);
          });
      }
    }

    if (dateParsingErrors.length > 0) {
      console.log('\n❌ 日付パースエラーの例（最初の5件）:');
      dateParsingErrors.slice(0, 5).forEach((error, index) => {
        console.log(`${index + 1}. ID: ${error.id}, 日付: ${JSON.stringify(error.applicationDate)}`);
      });
    }

  } catch (error) {
    console.error('❌ 調査エラー:', error);
  }
}

// メイン実行
investigateDateRange().then(() => {
  console.log('\n🎯 日付範囲調査完了');
  process.exit(0);
}).catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
}); 