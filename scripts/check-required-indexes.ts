import { initializeFirebaseAdmin } from '@/lib/firebase/admin';
import logger from '@/lib/logger';

// 確認のみ（作成は firestore.indexes.json / gcloud 側で）
async function main() {
  try {
    initializeFirebaseAdmin();
    // Firestore Admin SDKに「インデックス一覧取得」のAPIが無いため、ガイド出力のみ
    // 将来的にREST Admin APIを叩く実装に差し替え可
    logger.info('[INDEX] 必須インデックス（確認ガイド）');
    const required = [
      { collection: 'applications', fields: ['jobCategory ASC', 'applicationDate ASC'] },
      { collection: 'applications', fields: ['jobCategory ASC', 'documentSubmitDate ASC'] },
      { collection: 'applications', fields: ['jobCategory ASC', 'interviewDate ASC'] },
      { collection: 'applications', fields: ['jobCategory ASC', 'interviewImplementedDate ASC'] },
      { collection: 'applications', fields: ['jobCategory ASC', 'hireDate ASC'] },
      { collection: 'applications', fields: ['jobCategory ASC', 'acceptanceDate ASC'] },
      { collection: 'applications', fields: ['status ASC', 'updatedAt ASC'] },
      { collection: 'weekly_reports', fields: ['reportType ASC', 'year DESC', 'weekNumber DESC'] },
      { collection: 'weekly_reports', fields: ['reportType ASC', 'jobCategory ASC', 'year DESC', 'weekNumber DESC'] },
    ];
    required.forEach(r => logger.info(r));
    logger.info('firestore.indexes.json と実環境の差分は、gcloud で確認/適用してください。');
  } catch (e) {
    logger.error({ e }, '[INDEX] check failed');
  }
}

main();





