import { generateAllJobCategoryWeeklyReports } from '@/lib/analytics/weekly-aggregation';
import { upsertWeeklyReport } from '@/lib/firestore/weekly_reports';

async function generatePastWeeks() {
  const weeks = [24, 23, 22];
  
  for (const week of weeks) {
    console.log(`\n=== 2025年第${week}週のレポート生成開始 ===`);
    
    try {
      const reports = await generateAllJobCategoryWeeklyReports(2025, week);
      
      for (const report of reports) {
        await upsertWeeklyReport(report);
        console.log(`${report.jobCategory} レポート保存完了`);
      }
      
      console.log(`=== 2025年第${week}週のレポート生成完了 ===`);
    } catch (error) {
      console.error(`Week ${week} generation failed:`, error);
    }
  }
  
  console.log('\n✅ 過去3週間のレポート生成が完了しました');
}

generatePastWeeks().catch(console.error); 