import { createInitiative } from '../lib/firestore/initiatives';
import { 
  InitiativeStatus, 
  InitiativeCategory, 
  Priority, 
  CreateInitiativeData 
} from '../lib/types/initiative';

// 既存のサンプルデータを新しい形式に変換
const sampleInitiatives: CreateInitiativeData[] = [
  {
    title: "VAの会社評判を更新し求職者が働きたいと思える口コミを増やす",
    category: InitiativeCategory.RECRUITMENT,
    status: InitiativeStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    assignee: "採用担当",
    dueDate: new Date("2024-07-31"),
    issue: "VADコミ評価が低いため、求職者の応募意欲が低下している",
    cause: "VADコミ評価が低く、既存の口コミ内容が不十分である",
    action: "「口コミ」を投稿して評価改善を図る",
    result: `6/7時点での効果：
・「転職会議」3.09（56）
（★1：10件/★2：5件/★3：7件/★4：20件/★5：8件）
・「Googleロコミ」3.3（12）
（★1：5件/★4：1件/★5：5件）
・「会社の評判」　（ホワイトハウス）4.54（26）
（★1：0件/★2：2件/★3：1件/★4：9件/★5：14件）5人の投稿`,
    createdBy: "システム移行"
  },
  {
    title: "新規メンバーの接触開始が1ヶ月以上遅れている課題解決",
    category: InitiativeCategory.STAFFING,
    status: InitiativeStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    assignee: "プロジェクト管理",
    dueDate: new Date("2024-06-30"),
    issue: "新規メンバーの接触開始が1ヶ月以上遅れている",
    cause: "現場との間に社内での条件が多いため、面接日程のやり取り等の連携に時間がかかる",
    action: "6/6プロジェクト株式会社とMTG\nReLコールセンターとのMTG",
    result: "2名応募中、条件共有を開始\n1名応募中、実施完了を開始",
    createdBy: "システム移行"
  },
  {
    title: "面接数増加のためのエントリーフォーム改善",
    category: InitiativeCategory.RECRUITMENT,
    status: InitiativeStatus.IN_PROGRESS,
    priority: Priority.MEDIUM,
    assignee: "採用担当",
    dueDate: new Date("2024-06-15"),
    issue: "面接数が少ない",
    cause: "エントリーから面接日決定まで日数がかかっている",
    action: "エントリーフォームの回答ページを改良（応募者に面接候補日を入力してもらう）→面接日が選びやすくならないよう改善日を提案",
    result: "今週から実施していたため、来週も効果を見て報告予定",
    createdBy: "システム移行"
  },
  {
    title: "求人ごとに必要なデータが揃えない問題解決",
    category: InitiativeCategory.SYSTEM_IMPROVEMENT,
    status: InitiativeStatus.COMPLETED,
    priority: Priority.MEDIUM,
    assignee: "データ分析",
    dueDate: new Date("2024-06-10"),
    issue: "求人ごとに必要なデータが揃えない",
    cause: "6/1より有料採用の分析フォームへ変更されたため",
    action: "5/31 メールにて問い合わせ\n6/6 MTG実施",
    result: "解決しており現在確認中",
    createdBy: "システム移行"
  },
  {
    title: "VAのSNSによる集客ツール作成",
    category: InitiativeCategory.MARKETING,
    status: InitiativeStatus.IN_PROGRESS,
    priority: Priority.MEDIUM,
    assignee: "マーケティング担当",
    dueDate: new Date("2024-08-31"),
    issue: "SNSでの集客力が不足している",
    cause: "効果的なSNSコンテンツが不足している",
    action: "インスタフィードをCanvaで作成中\nCTAスライド作成中\n4/2提出、川口さん確認待ち",
    result: "コンテンツ作成進行中、効果測定は来月実施予定",
    createdBy: "システム移行"
  },
  {
    title: "稼働開始後の早期離脱・切り替えの防止",
    category: InitiativeCategory.STAFFING,
    status: InitiativeStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    assignee: "稼働管理",
    dueDate: new Date("2024-07-15"),
    issue: "稼働開始後に早期離脱や切り替えが発生している",
    cause: "初期のサポート体制が不十分",
    action: "初回研修資料作成完了\n2/27に2名実施済み\nコール研修スクリプト作成済み",
    result: "初回研修実施により離脱率が改善傾向",
    createdBy: "システム移行"
  },
  {
    title: "新規稼働者の案件選定時間短縮",
    category: InitiativeCategory.SYSTEM_IMPROVEMENT,
    status: InitiativeStatus.IN_PROGRESS,
    priority: Priority.LOW,
    assignee: "システム担当",
    dueDate: new Date("2024-09-30"),
    issue: "新規稼働者の案件選定に時間がかかりすぎている",
    cause: "手動での案件マッチング処理が非効率",
    action: "AIによるフロー自動化導入\nLINE案件のNotion自動反映機能\n5/8木幡さん来社打ち合わせ実施",
    result: "自動化機能の実装が90%完了、テスト段階",
    createdBy: "システム移行"
  }
];

async function migrateSampleInitiatives() {
  console.log('🚀 サンプル施策データの移行を開始します...');
  
  try {
    for (let i = 0; i < sampleInitiatives.length; i++) {
      const initiative = sampleInitiatives[i];
      console.log(`📝 施策 ${i + 1}/${sampleInitiatives.length}: "${initiative.title}" を作成中...`);
      
      const initiativeId = await createInitiative(initiative);
      console.log(`✅ 施策作成完了: ${initiativeId}`);
      
      // 少し間隔を空ける
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('🎉 すべてのサンプル施策データの移行が完了しました！');
    console.log(`📊 合計 ${sampleInitiatives.length} 件の施策を作成しました。`);
    
  } catch (error) {
    console.error('❌ 移行中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  migrateSampleInitiatives()
    .then(() => {
      console.log('✨ 移行処理が正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 移行処理でエラーが発生しました:', error);
      process.exit(1);
    });
}

export { migrateSampleInitiatives }; 