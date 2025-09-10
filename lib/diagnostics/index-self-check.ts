import logger from '@/lib/logger';

let alreadyLogged = false;

export function logRequiredIndexesOnce(): void {
  if (alreadyLogged) return;
  alreadyLogged = true;
  try {
    logger.info('[INDEX] 必須インデックスの確認ガイド（不足時は firestore.indexes.json に追記してデプロイ）');
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
    required.forEach((r) => logger.info(r));
  } catch (e) {
    logger.warn({ e }, '[INDEX] self-check log failed');
  }
}





