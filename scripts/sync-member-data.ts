import { Client } from '@notionhq/client';
import { getAdminDb } from '../lib/firebase/admin';
import dotenv from 'dotenv';

// .env.localから環境変数を読み込む
dotenv.config({ path: '.env.local' });

// Notion設定
const NOTION_TOKEN = process.env.NOTION_TOKEN;
if (!NOTION_TOKEN) {
  throw new Error("環境変数 'NOTION_TOKEN' が設定されていません。");
}

const notion = new Client({
  auth: NOTION_TOKEN,
});

const MEMBERS_DATABASE_ID = process.env.NOTION_MEMBER_DB_ID;

if (!MEMBERS_DATABASE_ID) {
  throw new Error("環境変数 'NOTION_MEMBER_DB_ID' が設定されていません。");
}

interface NotionMemberData {
  id: string;
  name: string;
  status: string;
  lastWorkStartDate?: Date;
  lastWorkEndDate?: Date;
  contractEndDate?: Date;
  firstCounselingDate?: Date;
  confidence?: 'high' | 'medium' | 'low';
}

async function syncMemberData() {
  try {
    console.log('🔄 メンバーデータの同期を開始します...');

    // Notionからメンバーデータを取得
    const response = await notion.databases.query({
      database_id: MEMBERS_DATABASE_ID,
      filter: {
        property: 'ステータス',
        status: {
          is_not_empty: true
        }
      }
    });

    const db = getAdminDb();
    const batch = db.batch();

    for (const page of response.results) {
      if ('properties' in page) {
        const memberData = extractMemberData(page);
        
        if (memberData) {
          const memberRef = db.collection('members').doc(memberData.id);
          batch.set(memberRef, {
            ...memberData,
            updatedAt: new Date(),
            syncedAt: new Date()
          }, { merge: true });
        }
      }
    }

    await batch.commit();
    console.log(`✅ ${response.results.length}件のメンバーデータを同期しました`);

  } catch (error) {
    console.error('❌ メンバーデータ同期エラー:', error);
    throw error;
  }
}

function extractMemberData(page: any): NotionMemberData | null {
  try {
    const properties = page.properties;

    // 必須フィールドの確認
    const name = getTextProperty(properties, '名前');
    const status = getStatusProperty(properties, 'ステータス');

    if (!name || !status) {
      console.warn(`⚠️ 必須フィールドが不足: ${page.id}`);
      return null;
    }

    return {
      id: page.id,
      name,
      status,
      lastWorkStartDate: getDateProperty(properties, '最新業務開始日'),
      lastWorkEndDate: getDateProperty(properties, '最新業務終了日'),
      contractEndDate: getDateProperty(properties, '業務委託契約終了日'),
      firstCounselingDate: getDateProperty(properties, '初回カウンセリング実施日') || 
                          getDateProperty(properties, '初回実施日'),
      confidence: getSelectProperty(properties, '確度') as 'high' | 'medium' | 'low' | undefined
    };

  } catch (error) {
    console.error(`❌ データ抽出エラー (${page.id}):`, error);
    return null;
  }
}

// Notionプロパティ取得ヘルパー関数
function getTextProperty(properties: any, propertyName: string): string | undefined {
  const prop = properties[propertyName];
  if (!prop) return undefined;

  switch (prop.type) {
    case 'title':
      return prop.title?.[0]?.plain_text;
    case 'rich_text':
      return prop.rich_text?.[0]?.plain_text;
    default:
      return undefined;
  }
}

function getStatusProperty(properties: any, propertyName: string): string | undefined {
  const prop = properties[propertyName];
  return prop?.status?.name;
}

function getSelectProperty(properties: any, propertyName: string): string | undefined {
  const prop = properties[propertyName];
  return prop?.select?.name;
}

function getDateProperty(properties: any, propertyName: string): Date | undefined {
  const prop = properties[propertyName];
  if (prop?.date?.start) {
    return new Date(prop.date.start);
  }
  return undefined;
}

// スクリプト実行
if (require.main === module) {
  syncMemberData()
    .then(() => {
      console.log('🎉 同期完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 同期失敗:', error);
      process.exit(1);
    });
}

export { syncMemberData }; 