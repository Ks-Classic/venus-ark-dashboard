import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { format } from 'date-fns';
// メトリクス計算関数を直接定義（インポートエラー回避）
function calculateRecruitmentMetrics(applications: any[], startDate: Date, endDate: Date) {
  const filteredApplications = applications.filter(app => 
    app.applicationDate >= startDate && app.applicationDate <= endDate
  );

  const applicationCount = filteredApplications.length;
  const internalRejectionCount = filteredApplications.filter(app => app.status === '応募落ち').length;
  const documentRejectionCount = filteredApplications.filter(app => app.status === '書類落ち').length;
  const rejectionCount = filteredApplications.filter(app => app.status === '不採用').length;

  const rejectionReasons = {
    experienced: 0,
    elderly: 0,
    unsuitable: 0,
    foreign: 0,
    other: 0
  };

  filteredApplications.forEach(app => {
    if (['応募落ち', '書類落ち', '不採用'].includes(app.status)) {
      const reason = app.rejectionReason || '';
      if (reason.includes('経験') || reason.includes('スキル')) {
        rejectionReasons.experienced++;
      } else if (reason.includes('年齢') || reason.includes('高齢')) {
        rejectionReasons.elderly++;
      } else if (reason.includes('不適合') || reason.includes('合わない')) {
        rejectionReasons.unsuitable++;
      } else if (reason.includes('外国') || reason.includes('国籍')) {
        rejectionReasons.foreign++;
      } else if (reason) {
        rejectionReasons.other++;
      }
    }
  });

  return {
    applicationCount,
    internalRejectionCount,
    documentRejectionCount,
    rejectionCount,
    rejectionReasons
  };
}

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

async function testApril2025Data() {
  console.log('🔍 2025年4月データでのメトリクス計算テスト\n');

  try {
    const allApplicationsSnapshot = await db.collection('applications').get();
    
    // 2025年4月の第1週（2025-04-01〜2025-04-07）のデータを抽出
    const april2025Week1Start = new Date('2025-04-01');
    const april2025Week1End = new Date('2025-04-07');
    
    const april2025Applications = allApplicationsSnapshot.docs.filter(doc => {
      const data = doc.data();
      let applicationDate;
      
      if (data.applicationDate?.toDate) {
        applicationDate = data.applicationDate.toDate();
      } else if (data.applicationDate?.seconds) {
        applicationDate = new Date(data.applicationDate.seconds * 1000);
      } else if (typeof data.applicationDate === 'string') {
        applicationDate = new Date(data.applicationDate);
      } else {
        return false;
      }
      
      return applicationDate >= april2025Week1Start && applicationDate <= april2025Week1End;
    });

    console.log(`2025年4月第1週（${format(april2025Week1Start, 'yyyy-MM-dd')}〜${format(april2025Week1End, 'yyyy-MM-dd')}）のデータ数: ${april2025Applications.length}件\n`);

    if (april2025Applications.length > 0) {
      console.log('📋 データ詳細:');
      april2025Applications.forEach((doc, index) => {
        const data = doc.data();
        let applicationDate;
        if (data.applicationDate?.toDate) {
          applicationDate = data.applicationDate.toDate();
        } else if (data.applicationDate?.seconds) {
          applicationDate = new Date(data.applicationDate.seconds * 1000);
        } else {
          applicationDate = new Date(data.applicationDate);
        }
        
        console.log(`${index + 1}. ID: ${doc.id}`);
        console.log(`   応募日: ${format(applicationDate, 'yyyy-MM-dd')}`);
        console.log(`   ステータス: ${data.status || 'unknown'}`);
        console.log(`   不採用理由: ${data.rejectionReason || 'なし'}`);
        console.log(`   職種: ${data.jobCategory || 'unknown'}`);
        console.log(`   媒体: ${data.mediaSource || 'unknown'}`);
        console.log();
      });

      // ステータス分布
      const statusCounts: Record<string, number> = {};
      april2025Applications.forEach(doc => {
        const status = doc.data().status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      console.log('📊 ステータス分布:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}件`);
      });
      console.log();

      // メトリクス計算テスト
      const mockApplications = april2025Applications.map(doc => {
        const data = doc.data();
        let applicationDate;
        if (data.applicationDate?.toDate) {
          applicationDate = data.applicationDate.toDate();
        } else if (data.applicationDate?.seconds) {
          applicationDate = new Date(data.applicationDate.seconds * 1000);
        } else {
          applicationDate = new Date(data.applicationDate);
        }

        return {
          id: doc.id,
          applicationDate,
          status: data.status || 'unknown',
          rejectionReason: data.rejectionReason || '',
          formSubmissionDate: data.formSubmissionDate ? 
            (data.formSubmissionDate.toDate ? data.formSubmissionDate.toDate() : new Date(data.formSubmissionDate)) : 
            null,
          interviewDate: data.interviewDate ?
            (data.interviewDate.toDate ? data.interviewDate.toDate() : new Date(data.interviewDate)) :
            null,
          jobCategory: data.jobCategory || '',
          mediaSource: data.mediaSource || ''
        };
      });

      console.log('🧮 メトリクス計算実行...');
      const metrics = calculateRecruitmentMetrics(mockApplications, april2025Week1Start, april2025Week1End);
      
      console.log('\n📊 計算結果:');
      console.log(`応募数: ${metrics.applicationCount}`);
      console.log(`内不採用数（応募落ち）: ${metrics.internalRejectionCount}`);
      console.log(`書類内不採用数（書類落ち）: ${metrics.documentRejectionCount}`);
      console.log(`従来の不採用数: ${metrics.rejectionCount}`);
      console.log(`不採用理由内訳: ${JSON.stringify(metrics.rejectionReasons)}`);
      
    } else {
      console.log('❌ 2025年4月第1週にデータが存在しません');
      
      // 2025年4月全体のデータを確認
      const april2025AllStart = new Date('2025-04-01');
      const april2025AllEnd = new Date('2025-04-30');
      
      const allAprilApplications = allApplicationsSnapshot.docs.filter(doc => {
        const data = doc.data();
        let applicationDate;
        
        if (data.applicationDate?.toDate) {
          applicationDate = data.applicationDate.toDate();
        } else if (data.applicationDate?.seconds) {
          applicationDate = new Date(data.applicationDate.seconds * 1000);
        } else if (typeof data.applicationDate === 'string') {
          applicationDate = new Date(data.applicationDate);
        } else {
          return false;
        }
        
        return applicationDate >= april2025AllStart && applicationDate <= april2025AllEnd;
      });

      console.log(`\n2025年4月全体のデータ数: ${allAprilApplications.length}件`);
      
      if (allAprilApplications.length > 0) {
        console.log('2025年4月の日付分布:');
        const dateCounts: Record<string, number> = {};
        allAprilApplications.forEach(doc => {
          const data = doc.data();
          let applicationDate;
          if (data.applicationDate?.toDate) {
            applicationDate = data.applicationDate.toDate();
          } else if (data.applicationDate?.seconds) {
            applicationDate = new Date(data.applicationDate.seconds * 1000);
          } else {
            applicationDate = new Date(data.applicationDate);
          }
          const dateKey = format(applicationDate, 'yyyy-MM-dd');
          dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
        });

        Object.entries(dateCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(0, 10)
          .forEach(([date, count]) => {
            console.log(`  ${date}: ${count}件`);
          });
      }
    }

  } catch (error) {
    console.error('❌ テストエラー:', error);
  }
}

// メイン実行
testApril2025Data().then(() => {
  console.log('\n🎯 2025年4月データテスト完了');
  process.exit(0);
}).catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
}); 