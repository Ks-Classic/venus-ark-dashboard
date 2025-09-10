import { runEnhancedNotionSync } from '@/lib/integrations/enhanced-notion-sync';

async function runNotionSyncEnhancements() {
  console.log('=== Notion同期改善処理開始 ===');
  console.log(`実行時刻: ${new Date().toISOString()}`);
  
  try {
    const result = await runEnhancedNotionSync();
    
    console.log('\n=== 処理結果 ===');
    console.log(`合計更新数: ${result.totalUpdated}名`);
    
    // 開始日修正処理の結果
    console.log('\n【開始日修正処理】');
    console.log(`処理対象: ${result.startDateResult.processedCount}名`);
    console.log(`更新数: ${result.startDateResult.updatedCount}名`);
    console.log(`成功: ${result.startDateResult.success}`);
    
    if (result.startDateResult.updates.length > 0) {
      console.log('\n開始日修正による更新:');
      result.startDateResult.updates.forEach(update => {
        console.log(`- ${update.name}:`);
        update.fieldUpdates.forEach(field => {
          console.log(`  ${field}`);
        });
      });
    }
    
    if (result.startDateResult.errors.length > 0) {
      console.log('\n開始日修正エラー:');
      result.startDateResult.errors.forEach(error => {
        console.log(`- ${error}`);
      });
    }
    
    // 不採用メンバー修正処理の結果
    console.log('\n【不採用メンバー修正処理】');
    console.log(`処理対象: ${result.rejectedMembersResult.processedCount}名`);
    console.log(`更新数: ${result.rejectedMembersResult.updatedCount}名`);
    console.log(`成功: ${result.rejectedMembersResult.success}`);
    
    if (result.rejectedMembersResult.updates.length > 0) {
      console.log('\n不採用メンバー修正による更新:');
      result.rejectedMembersResult.updates.forEach(update => {
        console.log(`- ${update.name}:`);
        update.fieldUpdates.forEach(field => {
          console.log(`  ${field}`);
        });
      });
    }
    
    if (result.rejectedMembersResult.errors.length > 0) {
      console.log('\n不採用メンバー修正エラー:');
      result.rejectedMembersResult.errors.forEach(error => {
        console.log(`- ${error}`);
      });
    }
    

    
    console.log('\n=== Notion同期改善処理完了 ===');
    
  } catch (error) {
    console.error('Notion同期改善処理中にエラーが発生:', error);
  }
}

runNotionSyncEnhancements().catch(console.error); 