const { Client } = require('@notionhq/client');

// Notionクライアントの初期化
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const MEMBER_DB_ID = process.env.NOTION_MEMBER_DB_ID;

async function debugLastWorkEndDate() {
  try {
    console.log('=== Notionの「最新業務終了日」フィールド確認 ===');
    
    if (!MEMBER_DB_ID) {
      throw new Error('NOTION_MEMBER_DB_ID が設定されていません');
    }
    
    // データベース構造を確認
    const dbInfo = await notion.databases.retrieve({ database_id: MEMBER_DB_ID });
    console.log('\n=== データベースプロパティ一覧 ===');
    
    const properties = dbInfo.properties;
    Object.keys(properties).forEach(key => {
      const prop = properties[key];
      console.log(`${key}: ${prop.type}`);
    });
    
    // 「最新業務終了日」プロパティが存在するかチェック
    const endDateProps = Object.keys(properties).filter(key => 
      key.includes('終了') || key.includes('最新') || key.toLowerCase().includes('end')
    );
    
    console.log(`\n=== 終了日関連プロパティ ===`);
    endDateProps.forEach(key => {
      console.log(`${key}: ${properties[key].type}`);
    });
    
    // メンバーデータを取得して「最新業務終了日」の値を確認
    const response = await notion.databases.query({
      database_id: MEMBER_DB_ID,
      page_size: 10,
    });
    
    console.log(`\n=== メンバーデータサンプル（${response.results.length}件） ===`);
    
    response.results.forEach((page, index) => {
      const properties = page.properties;
      const name = properties['名前']?.title?.[0]?.plain_text || 'Unknown';
      
      console.log(`\n[${index + 1}] ${name}`);
      
      // 終了日関連のフィールドをチェック
      endDateProps.forEach(key => {
        const value = properties[key];
        if (value?.date?.start) {
          console.log(`  ${key}: ${value.date.start}`);
        } else if (value) {
          console.log(`  ${key}: 値なし (type: ${value.type})`);
        } else {
          console.log(`  ${key}: プロパティなし`);
        }
      });
    });
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

debugLastWorkEndDate(); 