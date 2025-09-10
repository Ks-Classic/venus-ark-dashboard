import { initializeFirebaseAdmin, getAdminDb } from '../lib/firebase/admin';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config({ path: '.env.local' });

async function debugRecruitmentData() {
  console.log('=== 採用データの調査開始 ===\n');

  // Firebase Admin SDK を初期化
  initializeFirebaseAdmin();
  const db = getAdminDb();

  // 1. 最新のapplicationsデータを確認
  console.log('1. 最新の応募データ（直近20件）:');
  const applicationsSnapshot = await db.collection('applications')
    .orderBy('applicationDate', 'desc')
    .limit(20)
    .get();

  const statusCounts: Record<string, number> = {};
  const rejectionReasonCounts: Record<string, number> = {};
  let interviewImplementedCount = 0;
  let interviewDateCount = 0;

  applicationsSnapshot.forEach((doc) => {
    const data = doc.data();
    
    // ステータスの集計
    const status = data.status || '未設定';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // 不採用理由の集計
    if (['不採用', '応募落ち', '書類落ち', '面談不参加', '離脱'].includes(status)) {
      const reason = data.rejectionReason || 'なし';
      rejectionReasonCounts[reason] = (rejectionReasonCounts[reason] || 0) + 1;
    }

    // 面談実施日の存在確認
    if (data.interviewImplementedDate) {
      interviewImplementedCount++;
    }
    if (data.interviewDate) {
      interviewDateCount++;
    }

    console.log(`  - ${data.applicantName}: status="${status}", rejectionReason="${data.rejectionReason || 'なし'}", interviewImplementedDate="${data.interviewImplementedDate || 'なし'}"`);
  });

  console.log('\n2. ステータス別集計:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  - ${status}: ${count}件`);
  });

  console.log('\n3. 不採用理由別集計:');
  Object.entries(rejectionReasonCounts).forEach(([reason, count]) => {
    console.log(`  - ${reason}: ${count}件`);
  });

  console.log(`\n4. 面談データの状況:`);
  console.log(`  - interviewImplementedDate が存在: ${interviewImplementedCount}件`);
  console.log(`  - interviewDate が存在: ${interviewDateCount}件`);

  // 5. 週次サマリーデータの確認
  console.log('\n5. 最新の週次サマリーデータ:');
  const summariesSnapshot = await db.collection('optimized_weekly_summaries')
    .orderBy('weekKey', 'desc')
    .limit(5)
    .get();

  summariesSnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`\n  週: ${data.weekKey || doc.id}`);
    console.log(`  - 応募数: ${data.totals?.byJobCategory?.SNS_OPERATION?.applications || 0}`);
    console.log(`  - 不採用数: ${data.totals?.byJobCategory?.SNS_OPERATION?.rejected || 0}`);
    console.log(`  - 面接数: ${data.totals?.byJobCategory?.SNS_OPERATION?.interviews || 0}`);
    
    const rejectionReasons = data.totals?.byJobCategory?.SNS_OPERATION?.rejectionReasons;
    if (rejectionReasons) {
      console.log(`  - 不採用理由内訳:`);
      console.log(`    - 経験者: ${rejectionReasons.experienced || 0}`);
      console.log(`    - 高齢: ${rejectionReasons.elderly || 0}`);
      console.log(`    - 不適合: ${rejectionReasons.unsuitable || 0}`);
      console.log(`    - 外国籍: ${rejectionReasons.foreign || 0}`);
      console.log(`    - その他: ${rejectionReasons.other || 0}`);
    }
  });

  // 6. 同期ログの確認
  console.log('\n6. 最新の同期ログ:');
  const syncLogsSnapshot = await db.collection('sync_logs')
    .orderBy('syncedAt', 'desc')
    .limit(5)
    .get();

  syncLogsSnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`  - ${data.syncedAt.toDate().toISOString()}: ${data.syncType}, 成功=${data.success}, 件数=${data.recordsProcessed}`);
  });

  console.log('\n=== 調査完了 ===');
}

debugRecruitmentData().catch(console.error); 