import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

// Notion APIクライアントの初期化
const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY,
});

const MEMBER_DB_ID = process.env.NOTION_MEMBER_DB_ID;

async function debugSpecificFields() {
  console.log('🔍 特定フィールドの詳細確認');
  console.log('='.repeat(50));

  if (!MEMBER_DB_ID) {
    console.error('❌ NOTION_MEMBER_DB_ID が設定されていません');
    return;
  }

  try {
    // 1. 全メンバーを取得して統計を確認
    console.log('\\n📊 全メンバーの日付フィールド統計');
    const response = await notion.databases.query({
      database_id: MEMBER_DB_ID,
      page_size: 100,
    });

    console.log(`総メンバー数: ${response.results.length}`);

    const stats = {
      hasLastWorkStartDate: 0,
      hasLastWorkEndDate: 0,
      hasFirstCounselingDate: 0,
      hasContractEndDate: 0,
      hasContractStartDate: 0,
    };

    const sampleData: any[] = [];

    response.results.forEach((page: any) => {
      const properties = page.properties;
      const name = properties['名前']?.title?.[0]?.plain_text || 'Unknown';
      
      // 各フィールドの値を確認
      const lastWorkStartDate = properties['最新業務開始日'];
      const lastWorkEndDate = properties['最新業務終了日 ']; // 末尾にスペース
      const firstCounselingDate = properties['初回実施日'];
      const contractEndDate = properties['業務委託契約終了日'];
      const contractStartDate = properties['業務委託契約締結日'];

      if (lastWorkStartDate?.date) stats.hasLastWorkStartDate++;
      if (lastWorkEndDate?.date) stats.hasLastWorkEndDate++;
      if (firstCounselingDate?.date) stats.hasFirstCounselingDate++;
      if (contractEndDate?.date) stats.hasContractEndDate++;
      if (contractStartDate?.date) stats.hasContractStartDate++;

      // サンプルデータを保存（値があるもののみ）
      if (lastWorkStartDate?.date || lastWorkEndDate?.date || firstCounselingDate?.date || contractEndDate?.date || contractStartDate?.date) {
        sampleData.push({
          name,
          lastWorkStartDate: lastWorkStartDate?.date,
          lastWorkEndDate: lastWorkEndDate?.date,
          firstCounselingDate: firstCounselingDate?.date,
          contractEndDate: contractEndDate?.date,
          contractStartDate: contractStartDate?.date,
        });
      }
    });

    console.log('\\n📈 統計結果:');
    console.log(`  最新業務開始日あり: ${stats.hasLastWorkStartDate} (${(stats.hasLastWorkStartDate/response.results.length*100).toFixed(1)}%)`);
    console.log(`  最新業務終了日あり: ${stats.hasLastWorkEndDate} (${(stats.hasLastWorkEndDate/response.results.length*100).toFixed(1)}%)`);
    console.log(`  初回実施日あり: ${stats.hasFirstCounselingDate} (${(stats.hasFirstCounselingDate/response.results.length*100).toFixed(1)}%)`);
    console.log(`  業務委託契約終了日あり: ${stats.hasContractEndDate} (${(stats.hasContractEndDate/response.results.length*100).toFixed(1)}%)`);
    console.log(`  業務委託契約締結日あり: ${stats.hasContractStartDate} (${(stats.hasContractStartDate/response.results.length*100).toFixed(1)}%)`);

    console.log('\\n📋 実際の値があるメンバーサンプル（最大10件）:');
    sampleData.slice(0, 10).forEach((member, index) => {
      console.log(`\\n--- ${index + 1}. ${member.name} ---`);
      console.log(`  最新業務開始日: ${member.lastWorkStartDate ? JSON.stringify(member.lastWorkStartDate) : 'null'}`);
      console.log(`  最新業務終了日: ${member.lastWorkEndDate ? JSON.stringify(member.lastWorkEndDate) : 'null'}`);
      console.log(`  初回実施日: ${member.firstCounselingDate ? JSON.stringify(member.firstCounselingDate) : 'null'}`);
      console.log(`  契約終了日: ${member.contractEndDate ? JSON.stringify(member.contractEndDate) : 'null'}`);
      console.log(`  契約締結日: ${member.contractStartDate ? JSON.stringify(member.contractStartDate) : 'null'}`);
    });

    // 2. 工藤正熙さんと小柳考平さんを検索
    console.log('\\n🎯 特定メンバーの検索');
    const targetNames = ['工藤', '小柳'];
    
    targetNames.forEach(name => {
      const foundMembers = response.results.filter((page: any) => {
        const memberName = page.properties['名前']?.title?.[0]?.plain_text || '';
        return memberName.includes(name);
      });

      console.log(`\\n${name}を含むメンバー: ${foundMembers.length}件`);
      foundMembers.forEach((page: any) => {
        const memberName = page.properties['名前']?.title?.[0]?.plain_text || 'Unknown';
        console.log(`  - ${memberName}`);
      });
    });

  } catch (error) {
    console.error('❌ エラー発生:', error);
  }

  console.log('\\n='.repeat(50));
  console.log('🔍 特定フィールドの詳細確認完了');
}

// 実行
debugSpecificFields().catch(console.error); 