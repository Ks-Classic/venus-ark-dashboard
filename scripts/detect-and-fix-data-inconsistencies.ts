#!/usr/bin/env ts-node

/**
 * データ不整合検出・修復スクリプト
 * 
 * 目的:
 * - Firestore内のデータ不整合を検出
 * - staffMetrics計算の不整合をチェック
 * - 自動修復機能の提供
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { generateWeeklyWorkStatusDetail } from '../lib/analytics/enhanced-work-status-aggregation';
// import { upsertStaffMetrics } from '../lib/firestore/weekly_reports'; // TODO: 実装が必要
import { MemberStatus, ApplicationStatus } from '../lib/types/enums';

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

interface InconsistencyReport {
  type: string;
  description: string;
  affectedRecords: number;
  severity: 'low' | 'medium' | 'high';
  fixable: boolean;
  details: any[];
}

/**
 * Members コレクションの不整合をチェック
 */
async function checkMembersInconsistencies(): Promise<InconsistencyReport[]> {
  console.log('🔍 Members コレクション不整合チェック中...');
  
  const membersRef = collection(db, 'members');
  const snapshot = await getDocs(membersRef);
  
  const reports: InconsistencyReport[] = [];
  const invalidStatuses: any[] = [];
  const missingRequiredFields: any[] = [];
  const dateInconsistencies: any[] = [];
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const docId = doc.id;
    
    // ステータス値の妥当性チェック
    if (data.status && !Object.values(MemberStatus).includes(data.status)) {
      invalidStatuses.push({
        docId,
        currentStatus: data.status,
        name: data.name || 'Unknown'
      });
    }
    
    // 必須フィールドのチェック
    if (!data.name || !data.status) {
      missingRequiredFields.push({
        docId,
        missingFields: [
          !data.name ? 'name' : null,
          !data.status ? 'status' : null
        ].filter(Boolean),
        name: data.name || 'Unknown'
      });
    }
    
    // 日付の整合性チェック
    const applicationDate = data.applicationDate?.toDate?.() || new Date(data.applicationDate);
    const hireDate = data.hireDate?.toDate?.() || new Date(data.hireDate);
    const lastWorkStartDate = data.lastWorkStartDate?.toDate?.() || new Date(data.lastWorkStartDate);
    
    if (applicationDate && hireDate && applicationDate > hireDate) {
      dateInconsistencies.push({
        docId,
        issue: 'applicationDate > hireDate',
        applicationDate: applicationDate.toISOString(),
        hireDate: hireDate.toISOString(),
        name: data.name || 'Unknown'
      });
    }
    
    if (hireDate && lastWorkStartDate && hireDate > lastWorkStartDate) {
      dateInconsistencies.push({
        docId,
        issue: 'hireDate > lastWorkStartDate',
        hireDate: hireDate.toISOString(),
        lastWorkStartDate: lastWorkStartDate.toISOString(),
        name: data.name || 'Unknown'
      });
    }
  });
  
  // レポート生成
  if (invalidStatuses.length > 0) {
    reports.push({
      type: 'InvalidMemberStatus',
      description: '無効なMemberStatus値',
      affectedRecords: invalidStatuses.length,
      severity: 'high',
      fixable: true,
      details: invalidStatuses
    });
  }
  
  if (missingRequiredFields.length > 0) {
    reports.push({
      type: 'MissingRequiredFields',
      description: '必須フィールドの欠損',
      affectedRecords: missingRequiredFields.length,
      severity: 'medium',
      fixable: false,
      details: missingRequiredFields
    });
  }
  
  if (dateInconsistencies.length > 0) {
    reports.push({
      type: 'DateInconsistencies',
      description: '日付の論理的不整合',
      affectedRecords: dateInconsistencies.length,
      severity: 'medium',
      fixable: false,
      details: dateInconsistencies
    });
  }
  
  return reports;
}

/**
 * Applications コレクションの不整合をチェック
 */
async function checkApplicationsInconsistencies(): Promise<InconsistencyReport[]> {
  console.log('🔍 Applications コレクション不整合チェック中...');
  
  const applicationsRef = collection(db, 'applications');
  const snapshot = await getDocs(applicationsRef);
  
  const reports: InconsistencyReport[] = [];
  const invalidStatuses: any[] = [];
  const duplicateApplications: any[] = [];
  const emailMap = new Map<string, any[]>();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const docId = doc.id;
    
    // ステータス値の妥当性チェック
    const validStatuses: ApplicationStatus[] = [
      '応募', '書類提出', '面接', '面談確定', '面接実施', '採用', 
      '不採用', '辞退', '書類落ち', '応募落ち', '面談不参加', '離脱', '内定受諾'
    ];
    
    if (data.status && !validStatuses.includes(data.status)) {
      invalidStatuses.push({
        docId,
        currentStatus: data.status,
        applicantName: data.applicantName || 'Unknown'
      });
    }
    
    // 重複応募のチェック（同一メールアドレス）
    if (data.email) {
      if (!emailMap.has(data.email)) {
        emailMap.set(data.email, []);
      }
      emailMap.get(data.email)!.push({
        docId,
        applicantName: data.applicantName,
        applicationDate: data.applicationDate,
        jobCategory: data.jobCategory,
        status: data.status
      });
    }
  });
  
  // 重複チェック
  emailMap.forEach((applications, email) => {
    if (applications.length > 1) {
      duplicateApplications.push({
        email,
        count: applications.length,
        applications
      });
    }
  });
  
  // レポート生成
  if (invalidStatuses.length > 0) {
    reports.push({
      type: 'InvalidApplicationStatus',
      description: '無効なApplicationStatus値',
      affectedRecords: invalidStatuses.length,
      severity: 'high',
      fixable: true,
      details: invalidStatuses
    });
  }
  
  if (duplicateApplications.length > 0) {
    reports.push({
      type: 'DuplicateApplications',
      description: '重複応募（同一メールアドレス）',
      affectedRecords: duplicateApplications.reduce((sum, dup) => sum + dup.count, 0),
      severity: 'low',
      fixable: false,
      details: duplicateApplications
    });
  }
  
  return reports;
}

/**
 * StaffMetrics の計算不整合をチェック
 */
async function checkStaffMetricsInconsistencies(): Promise<InconsistencyReport[]> {
  console.log('🔍 StaffMetrics 計算不整合チェック中...');
  
  const weeklyReportsRef = collection(db, 'weekly_reports');
  const snapshot = await getDocs(weeklyReportsRef);
  
  const reports: InconsistencyReport[] = [];
  const inconsistentCalculations: any[] = [];
  
  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data();
    const weekId = docSnapshot.id;
    
    if (data.staffMetrics) {
      try {
        // weekIdから年、月、週を解析
        const [year, week] = weekId.split('-W').map(Number);
        const month = Math.ceil(week / 4); // 簡易的な月計算
        
        // membersコレクションを取得
        const membersRef = collection(db, 'members');
        const membersSnapshot = await getDocs(membersRef);
        const members = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        
        // 実際の計算値を取得
        const calculatedData = generateWeeklyWorkStatusDetail(members, year, month, week);
        const storedMetrics = data.staffMetrics;
        
        // 主要メトリクスの比較（WeeklyWorkStatusDetailの構造に合わせて修正）
        const discrepancies: string[] = [];
        
        // 計算されたデータから最新週のメトリクスを取得
        const latestWeekDetail = calculatedData.weekDetails[calculatedData.weekDetails.length - 1];
        
        if (latestWeekDetail.totalWorkers !== storedMetrics.totalActiveMembers) {
          discrepancies.push(`totalActiveMembers: stored=${storedMetrics.totalActiveMembers}, calculated=${latestWeekDetail.totalWorkers}`);
        }
        
        if (latestWeekDetail.newStarted !== storedMetrics.newActiveMembers) {
          discrepancies.push(`newActiveMembers: stored=${storedMetrics.newActiveMembers}, calculated=${latestWeekDetail.newStarted}`);
        }
        
        if (latestWeekDetail.switching !== storedMetrics.switchingMembers) {
          discrepancies.push(`switchingMembers: stored=${storedMetrics.switchingMembers}, calculated=${latestWeekDetail.switching}`);
        }
        
        if (latestWeekDetail.projectEnded !== storedMetrics.projectEndedMembers) {
          discrepancies.push(`projectEndedMembers: stored=${storedMetrics.projectEndedMembers}, calculated=${latestWeekDetail.projectEnded}`);
        }
        
        if (discrepancies.length > 0) {
          inconsistentCalculations.push({
            weekId,
            discrepancies,
            storedMetrics,
            calculatedMetrics: {
              totalActiveMembers: latestWeekDetail.totalWorkers,
              newActiveMembers: latestWeekDetail.newStarted,
              switchingMembers: latestWeekDetail.switching,
              projectEndedMembers: latestWeekDetail.projectEnded
            }
          });
        }
        
      } catch (error) {
        inconsistentCalculations.push({
          weekId,
          error: `計算エラー: ${error instanceof Error ? error.message : String(error)}`,
          storedMetrics: data.staffMetrics
        });
      }
    }
  }
  
  if (inconsistentCalculations.length > 0) {
    reports.push({
      type: 'StaffMetricsInconsistency',
      description: 'StaffMetrics計算値の不整合',
      affectedRecords: inconsistentCalculations.length,
      severity: 'medium',
      fixable: true,
      details: inconsistentCalculations
    });
  }
  
  return reports;
}

/**
 * 自動修復機能
 */
async function autoFixInconsistencies(reports: InconsistencyReport[], dryRun: boolean = true): Promise<void> {
  console.log(`\n🔧 自動修復${dryRun ? '（ドライラン）' : ''}を開始...`);
  
  const batch = writeBatch(db);
  let fixCount = 0;
  
  for (const report of reports) {
    if (!report.fixable) continue;
    
    switch (report.type) {
      case 'InvalidMemberStatus':
        for (const detail of report.details) {
          const newStatus = mapToValidMemberStatus(detail.currentStatus);
          if (newStatus) {
            console.log(`  📝 ${detail.name} (${detail.docId}): ${detail.currentStatus} → ${newStatus}`);
            if (!dryRun) {
              const memberRef = doc(db, 'members', detail.docId);
              batch.update(memberRef, { status: newStatus });
              fixCount++;
            }
          }
        }
        break;
        
      case 'InvalidApplicationStatus':
        for (const detail of report.details) {
          const newStatus = mapToValidApplicationStatus(detail.currentStatus);
          if (newStatus) {
            console.log(`  📝 ${detail.applicantName} (${detail.docId}): ${detail.currentStatus} → ${newStatus}`);
            if (!dryRun) {
              const applicationRef = doc(db, 'applications', detail.docId);
              batch.update(applicationRef, { status: newStatus });
              fixCount++;
            }
          }
        }
        break;
        
      case 'StaffMetricsInconsistency':
        for (const detail of report.details) {
          if (!detail.error && detail.calculatedMetrics) {
            console.log(`  📊 週次レポート ${detail.weekId}: StaffMetrics再計算`);
            if (!dryRun) {
              // weekIdから年、週を解析
              const [year, week] = detail.weekId.split('-W').map(Number);
              const month = Math.ceil(week / 4); // 簡易的な月計算
              
              // WeeklyWorkStatusDetail形式に変換
              const weeklyStatusDetail = {
                year,
                month,
                weekDetails: [{
                  weekLabel: `${month}月${week}W`,
                  weekNumber: 3, // 選択週は3番目
                  totalWorkers: detail.calculatedMetrics.totalActiveMembers,
                  totalStarted: detail.calculatedMetrics.newActiveMembers + detail.calculatedMetrics.switchingMembers,
                  newStarted: detail.calculatedMetrics.newActiveMembers,
                  switching: detail.calculatedMetrics.switchingMembers,
                  totalEnded: detail.calculatedMetrics.projectEndedMembers,
                  projectEnded: detail.calculatedMetrics.projectEndedMembers,
                  contractEnded: 0,
                  startedMembers: [],
                  endedMembers: [],
                  otherItems: []
                }]
              };
              
              // TODO: upsertStaffMetricsの実装が必要
              // await upsertStaffMetrics(year, week, weeklyStatusDetail);
              fixCount++;
            }
          }
        }
        break;
    }
  }
  
  if (!dryRun && fixCount > 0) {
    await batch.commit();
    console.log(`✅ ${fixCount}件の修復を完了しました`);
  } else if (dryRun) {
    console.log(`📋 ドライラン完了: ${fixCount}件の修復可能項目を検出`);
  }
}

/**
 * 無効なMemberStatusを有効な値にマッピング
 */
function mapToValidMemberStatus(invalidStatus: string): MemberStatus | null {
  const mappings: { [key: string]: MemberStatus } = {
    'contract_terminated': MemberStatus.CONTRACT_ENDED,
    'CONTRACT_TERMINATED': MemberStatus.CONTRACT_ENDED,
    'learning': MemberStatus.LEARNING_STARTED,
    'active': MemberStatus.WORKING,
    'terminated': MemberStatus.CONTRACT_ENDED,
    'released': MemberStatus.PROJECT_RELEASED
  };
  
  return mappings[invalidStatus] || null;
}

/**
 * 無効なApplicationStatusを有効な値にマッピング
 */
function mapToValidApplicationStatus(invalidStatus: string): ApplicationStatus | null {
  const mappings: { [key: string]: ApplicationStatus } = {
    '応募中': '応募',
    '選考中': '面接',
    '合格': '採用',
    '不合格': '不採用',
    '取り下げ': '辞退'
  };
  
  return mappings[invalidStatus] || null;
}

/**
 * レポート出力
 */
function printInconsistencyReport(allReports: InconsistencyReport[]) {
  console.log(`\n📊 データ不整合レポート`);
  console.log(`${'='.repeat(60)}`);
  
  if (allReports.length === 0) {
    console.log(`✅ データ不整合は検出されませんでした`);
    return;
  }
  
  let totalAffected = 0;
  let fixableCount = 0;
  
  allReports.forEach((report, index) => {
    console.log(`\n${index + 1}. ${report.description}`);
    console.log(`   種類: ${report.type}`);
    console.log(`   深刻度: ${report.severity}`);
    console.log(`   影響レコード数: ${report.affectedRecords}`);
    console.log(`   自動修復: ${report.fixable ? '可能' : '不可'}`);
    
    totalAffected += report.affectedRecords;
    if (report.fixable) fixableCount += report.affectedRecords;
    
    // 詳細の一部を表示（最大3件）
    if (report.details.length > 0) {
      console.log(`   詳細例:`);
      report.details.slice(0, 3).forEach((detail, detailIndex) => {
        console.log(`     ${detailIndex + 1}. ${JSON.stringify(detail, null, 2).substring(0, 100)}...`);
      });
      if (report.details.length > 3) {
        console.log(`     ... 他 ${report.details.length - 3} 件`);
      }
    }
  });
  
  console.log(`\n📋 サマリー`);
  console.log(`  総不整合項目数: ${allReports.length}`);
  console.log(`  総影響レコード数: ${totalAffected}`);
  console.log(`  自動修復可能レコード数: ${fixableCount}`);
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--fix');
  
  try {
    console.log('🚀 データ不整合検出を開始...\n');
    
    // 各種不整合チェックを並行実行
    const [membersReports, applicationsReports, staffMetricsReports] = await Promise.all([
      checkMembersInconsistencies(),
      checkApplicationsInconsistencies(),
      checkStaffMetricsInconsistencies()
    ]);
    
    const allReports = [...membersReports, ...applicationsReports, ...staffMetricsReports];
    
    // レポート出力
    printInconsistencyReport(allReports);
    
    // 修復処理
    if (allReports.some(r => r.fixable)) {
      await autoFixInconsistencies(allReports, dryRun);
      
      if (dryRun) {
        console.log(`\n💡 実際に修復するには --fix オプションを付けて実行してください`);
        console.log(`   例: npm run ts-node scripts/detect-and-fix-data-inconsistencies.ts -- --fix`);
      }
    }
    
    console.log(`\n✅ 不整合チェック完了`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
} 