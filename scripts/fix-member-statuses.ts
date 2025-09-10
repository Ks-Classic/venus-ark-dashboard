import { processAllMemberStatuses } from '@/lib/integrations/member-status-processor';

async function fixMemberStatuses() {
  console.log('=== メンバーステータス自動修正処理開始 ===');
  console.log(`実行時刻: ${new Date().toISOString()}`);
  
  try {
    const result = await processAllMemberStatuses();
    
    console.log('\n=== 処理結果 ===');
    console.log(`合計更新数: ${result.totalUpdated}名`);
    
    // 契約終了処理の結果
    console.log('\n【契約終了処理】');
    console.log(`更新数: ${result.contractEndedResult.updatedCount}名`);
    console.log(`成功: ${result.contractEndedResult.success}`);
    
    if (result.contractEndedResult.updates.length > 0) {
      console.log('\n契約終了処理による更新:');
      result.contractEndedResult.updates.forEach(update => {
        console.log(`- ${update.name}: ${update.oldStatus} → ${update.newStatus}`);
        console.log(`  理由: ${update.reason}`);
      });
    }
    
    if (result.contractEndedResult.errors.length > 0) {
      console.log('\n契約終了処理エラー:');
      result.contractEndedResult.errors.forEach(error => {
        console.log(`- ${error}`);
      });
    }
    
    // 稼働履歴処理の結果
    console.log('\n【稼働履歴処理】');
    console.log(`更新数: ${result.workHistoryResult.updatedCount}名`);
    console.log(`成功: ${result.workHistoryResult.success}`);
    
    if (result.workHistoryResult.updates.length > 0) {
      console.log('\n稼働履歴処理による更新:');
      result.workHistoryResult.updates.forEach(update => {
        console.log(`- ${update.name}: ${update.oldStatus} → ${update.newStatus}`);
        console.log(`  理由: ${update.reason}`);
      });
    }
    
    if (result.workHistoryResult.errors.length > 0) {
      console.log('\n稼働履歴処理エラー:');
      result.workHistoryResult.errors.forEach(error => {
        console.log(`- ${error}`);
      });
    }
    
    console.log('\n=== メンバーステータス自動修正処理完了 ===');
    
  } catch (error) {
    console.error('メンバーステータス修正処理中にエラーが発生:', error);
  }
}

fixMemberStatuses().catch(console.error); 