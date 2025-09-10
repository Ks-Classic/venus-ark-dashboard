import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Member } from '@/lib/types/member';

// Firebase Admin SDK の初期化
const serviceAccount = require('../venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json');

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

async function debugFirestoreMemberData() {
  console.log('🔍 Firestore メンバーデータ確認開始');
  console.log('='.repeat(50));

  try {
    // 1. メンバーコレクションの基本情報
    console.log('\n📊 メンバーコレクション基本情報');
    const membersRef = db.collection('members');
    const snapshot = await membersRef.limit(100).get();
    
    console.log(`総メンバー数: ${snapshot.size}`);
    
    if (snapshot.empty) {
      console.log('❌ メンバーデータが存在しません');
      return;
    }

    // 2. 重要フィールドの統計情報
    console.log('\n📈 重要フィールドの統計情報');
    const stats = {
      total: snapshot.size,
      hasLastWorkStartDate: 0,
      hasLastWorkEndDate: 0,
      hasFirstCounselingDate: 0,
      hasContractEndDate: 0,
      statusDistribution: {} as Record<string, number>,
      dateFieldTypes: {
        lastWorkStartDate: new Set<string>(),
        lastWorkEndDate: new Set<string>(),
        firstCounselingDate: new Set<string>(),
        contractEndDate: new Set<string>(),
      }
    };

    const sampleMembers: any[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      sampleMembers.push({ id: doc.id, ...data });
      
      // 統計情報の収集
      if (data.lastWorkStartDate) {
        stats.hasLastWorkStartDate++;
        stats.dateFieldTypes.lastWorkStartDate.add(typeof data.lastWorkStartDate);
      }
      if (data.lastWorkEndDate) {
        stats.hasLastWorkEndDate++;
        stats.dateFieldTypes.lastWorkEndDate.add(typeof data.lastWorkEndDate);
      }
      if (data.firstCounselingDate) {
        stats.hasFirstCounselingDate++;
        stats.dateFieldTypes.firstCounselingDate.add(typeof data.firstCounselingDate);
      }
      if (data.contractEndDate) {
        stats.hasContractEndDate++;
        stats.dateFieldTypes.contractEndDate.add(typeof data.contractEndDate);
      }
      
      const status = data.status || 'なし';
      stats.statusDistribution[status] = (stats.statusDistribution[status] || 0) + 1;
    });

    console.log('統計情報:');
    console.log(`  総メンバー数: ${stats.total}`);
    console.log(`  最新業務開始日あり: ${stats.hasLastWorkStartDate} (${(stats.hasLastWorkStartDate/stats.total*100).toFixed(1)}%)`);
    console.log(`  最新業務終了日あり: ${stats.hasLastWorkEndDate} (${(stats.hasLastWorkEndDate/stats.total*100).toFixed(1)}%)`);
    console.log(`  カウンセリング開始日あり: ${stats.hasFirstCounselingDate} (${(stats.hasFirstCounselingDate/stats.total*100).toFixed(1)}%)`);
    console.log(`  業務委託契約終了日あり: ${stats.hasContractEndDate} (${(stats.hasContractEndDate/stats.total*100).toFixed(1)}%)`);
    
    console.log('\n📅 日付フィールドの型分布:');
    Object.entries(stats.dateFieldTypes).forEach(([field, types]) => {
      console.log(`  ${field}: ${Array.from(types).join(', ')}`);
    });
    
    console.log('\n👥 ステータス分布:');
    Object.entries(stats.statusDistribution).forEach(([status, count]) => {
      console.log(`    ${status}: ${count}件`);
    });

    // 3. サンプルデータの詳細確認（最初の5件）
    console.log('\n📋 サンプルデータ詳細（最初の5件）');
    const sampleCount = Math.min(5, sampleMembers.length);
    
    for (let i = 0; i < sampleCount; i++) {
      const member = sampleMembers[i];
      console.log(`\n--- メンバー ${i + 1} ---`);
      console.log('ID:', member.id);
      console.log('名前:', member.name);
      console.log('ステータス:', member.status);
      
      // 日付フィールドの詳細
      const dateFields = ['lastWorkStartDate', 'lastWorkEndDate', 'firstCounselingDate', 'contractEndDate'];
      dateFields.forEach(field => {
        const value = member[field];
        if (value) {
          console.log(`${field}:`, value, `(型: ${typeof value})`);
          if (value.toDate && typeof value.toDate === 'function') {
            console.log(`  → Date変換: ${value.toDate()}`);
          }
        } else {
          console.log(`${field}: なし`);
        }
      });
    }

    // 4. 特定の問題のあるメンバーの確認
    console.log('\n🔍 特定メンバーの確認');
    const targetNames = ['工藤正熙', '小柳考平'];
    
    for (const name of targetNames) {
      const targetMember = sampleMembers.find(m => m.name && m.name.includes(name));
      if (targetMember) {
        console.log(`\n${name}さんのデータ:`);
        console.log('  ID:', targetMember.id);
        console.log('  名前:', targetMember.name);
        console.log('  最新業務開始日:', targetMember.lastWorkStartDate);
        console.log('  最新業務終了日:', targetMember.lastWorkEndDate);
        console.log('  ステータス:', targetMember.status);
      } else {
        console.log(`\n${name}さんのデータ: ❌ 見つかりません`);
      }
    }

    // 5. 7月1W期間の該当メンバー確認
    console.log('\n📅 7月1W期間（2025-06-30～2025-07-06）の該当メンバー');
    const weekStart = new Date('2025-06-30');
    const weekEnd = new Date('2025-07-06');
    
    console.log(`期間: ${weekStart.toISOString().split('T')[0]} ～ ${weekEnd.toISOString().split('T')[0]}`);
    
    const weekMembers = {
      newStarted: [] as any[],
      switching: [] as any[],
      projectEnded: [] as any[],
      contractEnded: [] as any[],
      counselingStarted: [] as any[],
    };
    
    sampleMembers.forEach(member => {
      // 日付の変換処理
      const getDateValue = (dateField: any) => {
        if (!dateField) return null;
        if (dateField.toDate && typeof dateField.toDate === 'function') {
          return dateField.toDate();
        }
        if (typeof dateField === 'string') {
          return new Date(dateField);
        }
        if (dateField instanceof Date) {
          return dateField;
        }
        return null;
      };
      
      const lastWorkStartDate = getDateValue(member.lastWorkStartDate);
      const lastWorkEndDate = getDateValue(member.lastWorkEndDate);
      const firstCounselingDate = getDateValue(member.firstCounselingDate);
      const contractEndDate = getDateValue(member.contractEndDate);
      
      // 新規開始判定
      if (lastWorkStartDate && lastWorkStartDate >= weekStart && lastWorkStartDate <= weekEnd && !lastWorkEndDate) {
        weekMembers.newStarted.push(member);
      }
      
      // 切替完了判定
      if (lastWorkStartDate && lastWorkStartDate >= weekStart && lastWorkStartDate <= weekEnd && lastWorkEndDate && lastWorkEndDate < lastWorkStartDate) {
        weekMembers.switching.push(member);
      }
      
      // 案件終了判定
      if (lastWorkEndDate && lastWorkEndDate >= weekStart && lastWorkEndDate <= weekEnd) {
        weekMembers.projectEnded.push(member);
      }
      
      // 契約終了判定
      if (contractEndDate && contractEndDate >= weekStart && contractEndDate <= weekEnd) {
        weekMembers.contractEnded.push(member);
      }
      
      // カウンセリング開始判定
      if (firstCounselingDate && firstCounselingDate >= weekStart && firstCounselingDate <= weekEnd) {
        weekMembers.counselingStarted.push(member);
      }
    });
    
    console.log('該当メンバー数:');
    console.log(`  新規開始: ${weekMembers.newStarted.length}人`);
    console.log(`  切替完了: ${weekMembers.switching.length}人`);
    console.log(`  案件終了: ${weekMembers.projectEnded.length}人`);
    console.log(`  契約終了: ${weekMembers.contractEnded.length}人`);
    console.log(`  カウンセリング開始: ${weekMembers.counselingStarted.length}人`);
    
    // 該当メンバーの詳細表示
    Object.entries(weekMembers).forEach(([category, members]) => {
      if (members.length > 0) {
        console.log(`\n${category}の詳細:`);
        members.forEach((member, index) => {
          console.log(`  ${index + 1}. ${member.name} (ID: ${member.id})`);
        });
      }
    });

  } catch (error) {
    console.error('❌ エラー発生:', error);
  }

  console.log('\n='.repeat(50));
  console.log('🔍 Firestore メンバーデータ確認完了');
}

// 実行
debugFirestoreMemberData().catch(console.error); 