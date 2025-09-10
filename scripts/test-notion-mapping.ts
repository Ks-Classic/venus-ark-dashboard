import { fetchMembers } from '@/lib/integrations/notion';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

async function testNotionMapping() {
  console.log('🔍 Notion同期マッピングテスト開始');
  console.log('='.repeat(50));

  try {
    // 1. 少数のメンバーデータを取得してマッピング確認
    console.log('\n📊 メンバーデータ取得テスト（5件）');
    const members = await fetchMembers(5);
    
    console.log(`取得件数: ${members.length}`);
    
    if (members.length === 0) {
      console.log('❌ メンバーデータが取得できませんでした');
      return;
    }

    // 2. 各メンバーの重要フィールドを確認
    console.log('\n📋 重要フィールドの確認');
    
    members.forEach((member, index) => {
      console.log(`\n--- メンバー ${index + 1}: ${member.name} ---`);
      console.log('ID:', member.id);
      console.log('名前:', member.name);
      console.log('ステータス:', member.status);
      
      // 日付フィールドの確認
      console.log('最新業務開始日:', member.lastWorkStartDate);
      console.log('最新業務終了日:', member.lastWorkEndDate);
      console.log('カウンセリング開始日:', member.firstCounselingDate);
      console.log('契約終了日:', member.contractEndDate);
      
      // 日付フィールドの型確認
      console.log('日付フィールドの型:');
      console.log('  lastWorkStartDate:', typeof member.lastWorkStartDate);
      console.log('  lastWorkEndDate:', typeof member.lastWorkEndDate);
      console.log('  firstCounselingDate:', typeof member.firstCounselingDate);
      console.log('  contractEndDate:', typeof member.contractEndDate);
    });

    // 3. 統計情報
    console.log('\n📈 フィールド存在率統計');
    const stats = {
      total: members.length,
      hasLastWorkStartDate: members.filter(m => m.lastWorkStartDate).length,
      hasLastWorkEndDate: members.filter(m => m.lastWorkEndDate).length,
      hasFirstCounselingDate: members.filter(m => m.firstCounselingDate).length,
      hasContractEndDate: members.filter(m => m.contractEndDate).length,
    };

    console.log(`総メンバー数: ${stats.total}`);
    console.log(`最新業務開始日あり: ${stats.hasLastWorkStartDate} (${(stats.hasLastWorkStartDate/stats.total*100).toFixed(1)}%)`);
    console.log(`最新業務終了日あり: ${stats.hasLastWorkEndDate} (${(stats.hasLastWorkEndDate/stats.total*100).toFixed(1)}%)`);
    console.log(`カウンセリング開始日あり: ${stats.hasFirstCounselingDate} (${(stats.hasFirstCounselingDate/stats.total*100).toFixed(1)}%)`);
    console.log(`契約終了日あり: ${stats.hasContractEndDate} (${(stats.hasContractEndDate/stats.total*100).toFixed(1)}%)`);

    // 4. 問題の分析
    console.log('\n🔍 問題分析');
    
    if (stats.hasLastWorkEndDate === 0) {
      console.log('❌ 最新業務終了日が全て取得できていません');
      console.log('   → Notion側でフィールドが存在しないか、マッピングに問題があります');
    }
    
    if (stats.hasFirstCounselingDate === 0) {
      console.log('❌ カウンセリング開始日が全て取得できていません');
      console.log('   → Notion側でフィールドが存在しないか、マッピングに問題があります');
    }
    
    if (stats.hasContractEndDate === 0) {
      console.log('❌ 契約終了日が全て取得できていません');
      console.log('   → Notion側でフィールドが存在しないか、マッピングに問題があります');
    }

    // 5. 特定メンバーの詳細確認
    console.log('\n🎯 特定メンバーの詳細確認');
    const targetNames = ['工藤正熙', '小柳考平'];
    
    for (const name of targetNames) {
      const targetMember = members.find(m => m.name && m.name.includes(name));
      if (targetMember) {
        console.log(`\n${name}さんの詳細:`);
        console.log('  ID:', targetMember.id);
        console.log('  名前:', targetMember.name);
        console.log('  最新業務開始日:', targetMember.lastWorkStartDate);
        console.log('  最新業務終了日:', targetMember.lastWorkEndDate);
        console.log('  カウンセリング開始日:', targetMember.firstCounselingDate);
        console.log('  契約終了日:', targetMember.contractEndDate);
        console.log('  ステータス:', targetMember.status);
        console.log('  稼働履歴件数:', targetMember.workHistory?.length || 0);
      } else {
        console.log(`\n${name}さん: ❌ 見つかりません`);
      }
    }

  } catch (error) {
    console.error('❌ エラー発生:', error);
    
    // エラーの詳細分析
    if (error instanceof Error) {
      if (error.message.includes('NOTION_')) {
        console.log('💡 環境変数が設定されていない可能性があります');
        console.log('   必要な環境変数: NOTION_TOKEN, NOTION_MEMBER_DB_ID');
      } else if (error.message.includes('Unauthorized')) {
        console.log('💡 Notion APIトークンの権限に問題がある可能性があります');
      } else if (error.message.includes('database_id')) {
        console.log('💡 NotionデータベースIDが正しくない可能性があります');
      }
    }
  }

  console.log('\n='.repeat(50));
  console.log('🔍 Notion同期マッピングテスト完了');
}

// 実行
testNotionMapping().catch(console.error); 