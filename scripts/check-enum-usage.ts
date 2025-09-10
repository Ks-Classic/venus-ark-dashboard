#!/usr/bin/env ts-node

/**
 * Enum 値の使用状況チェックスクリプト
 * 
 * 目的:
 * - データベース内で実際に使用されているenum値を調査
 * - 未使用のenum値を特定
 * - データ整合性のチェック
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { MemberStatus, ApplicationStatus, JobCategory, ProjectStatus } from '../lib/types/enums';

// Firebase設定
const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface EnumUsageReport {
  enumName: string;
  totalRecords: number;
  usedValues: { [key: string]: number };
  unusedValues: string[];
  invalidValues: { [key: string]: number };
}

/**
 * MemberStatus の使用状況をチェック
 */
async function checkMemberStatusUsage(): Promise<EnumUsageReport> {
  console.log('🔍 MemberStatus の使用状況をチェック中...');
  
  const membersRef = collection(db, 'members');
  const snapshot = await getDocs(membersRef);
  
  const usedValues: { [key: string]: number } = {};
  const invalidValues: { [key: string]: number } = {};
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const status = data.status;
    
    if (status) {
      if (Object.values(MemberStatus).includes(status)) {
        usedValues[status] = (usedValues[status] || 0) + 1;
      } else {
        invalidValues[status] = (invalidValues[status] || 0) + 1;
      }
    }
  });
  
  const allMemberStatuses = Object.values(MemberStatus);
  const unusedValues = allMemberStatuses.filter(status => !usedValues[status]);
  
  return {
    enumName: 'MemberStatus',
    totalRecords: snapshot.size,
    usedValues,
    unusedValues,
    invalidValues
  };
}

/**
 * ApplicationStatus の使用状況をチェック
 */
async function checkApplicationStatusUsage(): Promise<EnumUsageReport> {
  console.log('🔍 ApplicationStatus の使用状況をチェック中...');
  
  const applicationsRef = collection(db, 'applications');
  const snapshot = await getDocs(applicationsRef);
  
  const usedValues: { [key: string]: number } = {};
  const invalidValues: { [key: string]: number } = {};
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const status = data.status;
    
    if (status) {
      const validStatuses: ApplicationStatus[] = [
        '応募', '書類提出', '面接', '面談確定', '面接実施', '採用', 
        '不採用', '辞退', '書類落ち', '応募落ち', '面談不参加', '離脱', '内定受諾'
      ];
      
      if (validStatuses.includes(status)) {
        usedValues[status] = (usedValues[status] || 0) + 1;
      } else {
        invalidValues[status] = (invalidValues[status] || 0) + 1;
      }
    }
  });
  
  const validStatuses: ApplicationStatus[] = [
    '応募', '書類提出', '面接', '面談確定', '面接実施', '採用', 
    '不採用', '辞退', '書類落ち', '応募落ち', '面談不参加', '離脱', '内定受諾'
  ];
  const unusedValues = validStatuses.filter(status => !usedValues[status]);
  
  return {
    enumName: 'ApplicationStatus',
    totalRecords: snapshot.size,
    usedValues,
    unusedValues,
    invalidValues
  };
}

/**
 * JobCategory の使用状況をチェック
 */
async function checkJobCategoryUsage(): Promise<EnumUsageReport> {
  console.log('🔍 JobCategory の使用状況をチェック中...');
  
  // members と applications の両方をチェック
  const membersRef = collection(db, 'members');
  const applicationsRef = collection(db, 'applications');
  
  const [membersSnapshot, applicationsSnapshot] = await Promise.all([
    getDocs(membersRef),
    getDocs(applicationsRef)
  ]);
  
  const usedValues: { [key: string]: number } = {};
  const invalidValues: { [key: string]: number } = {};
  
  // Members コレクションをチェック
  membersSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const jobCategory = data.jobCategory;
    
    if (jobCategory) {
      if (Object.values(JobCategory).includes(jobCategory)) {
        usedValues[jobCategory] = (usedValues[jobCategory] || 0) + 1;
      } else {
        invalidValues[jobCategory] = (invalidValues[jobCategory] || 0) + 1;
      }
    }
  });
  
  // Applications コレクションをチェック
  applicationsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const jobCategory = data.jobCategory;
    
    if (jobCategory) {
      if (Object.values(JobCategory).includes(jobCategory)) {
        usedValues[jobCategory] = (usedValues[jobCategory] || 0) + 1;
      } else {
        invalidValues[jobCategory] = (invalidValues[jobCategory] || 0) + 1;
      }
    }
  });
  
  const allJobCategories = Object.values(JobCategory);
  const unusedValues = allJobCategories.filter(category => !usedValues[category]);
  
  return {
    enumName: 'JobCategory',
    totalRecords: membersSnapshot.size + applicationsSnapshot.size,
    usedValues,
    unusedValues,
    invalidValues
  };
}

/**
 * レポートを出力
 */
function printReport(report: EnumUsageReport) {
  console.log(`\n📊 ${report.enumName} 使用状況レポート`);
  console.log(`${'='.repeat(50)}`);
  console.log(`総レコード数: ${report.totalRecords}`);
  
  console.log(`\n✅ 使用中の値 (${Object.keys(report.usedValues).length}個):`);
  Object.entries(report.usedValues)
    .sort(([,a], [,b]) => b - a)
    .forEach(([value, count]) => {
      console.log(`  ${value}: ${count}件`);
    });
  
  if (report.unusedValues.length > 0) {
    console.log(`\n⚠️  未使用の値 (${report.unusedValues.length}個):`);
    report.unusedValues.forEach(value => {
      console.log(`  ${value}`);
    });
  } else {
    console.log(`\n✅ 未使用の値: なし`);
  }
  
  if (Object.keys(report.invalidValues).length > 0) {
    console.log(`\n❌ 無効な値 (${Object.keys(report.invalidValues).length}個):`);
    Object.entries(report.invalidValues)
      .sort(([,a], [,b]) => b - a)
      .forEach(([value, count]) => {
        console.log(`  ${value}: ${count}件`);
      });
  } else {
    console.log(`\n✅ 無効な値: なし`);
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🚀 Enum 使用状況チェックを開始...\n');
    
    const reports = await Promise.all([
      checkMemberStatusUsage(),
      checkApplicationStatusUsage(),
      checkJobCategoryUsage()
    ]);
    
    reports.forEach(printReport);
    
    // サマリー
    console.log(`\n📋 サマリー`);
    console.log(`${'='.repeat(50)}`);
    
    let totalUnusedValues = 0;
    let totalInvalidValues = 0;
    
    reports.forEach(report => {
      totalUnusedValues += report.unusedValues.length;
      totalInvalidValues += Object.keys(report.invalidValues).length;
    });
    
    console.log(`総未使用enum値: ${totalUnusedValues}個`);
    console.log(`総無効enum値: ${totalInvalidValues}個`);
    
    if (totalUnusedValues > 0) {
      console.log(`\n💡 推奨アクション:`);
      console.log(`  - 未使用のenum値の削除を検討`);
      console.log(`  - 削除前にコードレビューで影響範囲を確認`);
    }
    
    if (totalInvalidValues > 0) {
      console.log(`\n🔧 要修正:`);
      console.log(`  - 無効なenum値をデータベースから修正`);
      console.log(`  - バリデーション処理の強化を検討`);
    }
    
    console.log(`\n✅ チェック完了`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
} 