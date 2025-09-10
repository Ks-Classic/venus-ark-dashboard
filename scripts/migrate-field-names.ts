#!/usr/bin/env ts-node
/**
 * Firestoreのフィールド名を統一するマイグレーションスクリプト
 * lastWorkStartDate → firstWorkStartDate (最新業務開始日)
 * 
 * 使用方法:
 * npx tsx scripts/migrate-field-names.ts
 */

import dotenv from 'dotenv';
import { getAdminDb } from '../lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

async function migrateFieldNames() {
  try {
    console.log('=== フィールド名マイグレーション開始 ===');
    
    const db = getAdminDb();
    const snapshot = await db.collection('members').get();
    
    console.log(`対象メンバー数: ${snapshot.size}件`);
    
    const batch = db.batch();
    let updateCount = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // lastWorkStartDateがある場合のみ更新
      if (data.lastWorkStartDate) {
        const updateData: any = {
          firstWorkStartDate: data.lastWorkStartDate,
          lastWorkStartDate: FieldValue.delete()
        };
        
        batch.update(doc.ref, updateData);
        updateCount++;
        
        console.log(`更新予定: ${data.name} - ${data.lastWorkStartDate?.toDate?.()?.toISOString()?.split('T')[0]}`);
      }
    });
    
    if (updateCount > 0) {
      console.log(`\n${updateCount}件のドキュメントを更新します...`);
      
      // 確認を求める
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('実行しますか？ (y/N): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await batch.commit();
        console.log('✅ マイグレーション完了');
      } else {
        console.log('❌ マイグレーションをキャンセルしました');
      }
    } else {
      console.log('更新対象のドキュメントがありません');
    }
    
  } catch (error) {
    console.error('マイグレーションエラー:', error);
    process.exit(1);
  }
}

migrateFieldNames(); 