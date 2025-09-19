// 採用活動レポートの指標定義
export interface MetricDefinition {
  label: string;
  definition: string;
  method: string;
}

export const RECRUITMENT_COLLECTION_METRICS_DEFINITIONS: Record<string, MetricDefinition> = {
  applyCount: {
    label: '応募数',
    definition: '対象週（土曜日〜金曜日）に応募日が属する応募者の件数',
    method: '以下の条件を満たす応募者をカウント：\n• 採用管理シートの「応募日」列が対象週内に含まれる\n• 応募日が土曜日〜金曜日の範囲内\n\n注意：\n• 応募日が空白の場合は除外\n• 重複応募は1件としてカウント'
  },
  applyRejectCount: {
    label: '応募内不採用数',
    definition: '対象週に応募した応募者のうち、ステータスが「応募落ち」の件数',
    method: '以下の条件をすべて満たす応募者をカウント：\n• 採用管理シートの「応募日」列が対象週内\n• 採用管理シートの「現状ステータス」列に「応募落ち」が含まれる'
  },
  applyContinueCount: {
    label: '選考継続(応募)',
    definition: '対象週に応募した応募者のうち、選考が継続中の件数',
    method: '計算式：応募数 - 応募内不採用数\n\n詳細：\n• 応募数：対象週に応募日が含まれる全応募者数\n• 応募内不採用数：上記のうち「応募落ち」ステータスの件数\n• 結果：応募したが「応募落ち」ではない応募者数（選考継続中）'
  },
  documentSubmitted: {
    label: '書類提出数',
    definition: '対象週に書類提出またはエントリーフォーム送信があった件数',
    method: '以下の条件を満たす応募者をカウント：\n• エントリーフォームシートの「タイムスタンプ」列（A列）が対象週内\n• 書類提出が完了している状態\n\n対象となる書類：\n• 履歴書・職務経歴書\n• エントリーフォームの回答\n• その他必要な提出書類'
  },
  documentRejectCount: {
    label: '書類内不採用数',
    definition: '書類提出後に不採用となった件数',
    method: '以下の条件をすべて満たす応募者をカウント：\n• 採用管理シートの「現状ステータス」列が「書類落ち」\n• エントリーフォームシートの「タイムスタンプ」列が対象週内'
  },
  documentContinueCount: {
    label: '選考継続(書類)',
    definition: '書類提出後に選考が継続中の件数',
    method: '以下の計算式で算出：\n• 書類提出数 - 書類内不採用数\n\n選考継続の状態：\n• 書類選考を通過し、次のステップ（面接など）に進む\n• 書類内容の確認中で結果待ちの状態'
  }
};

// 面接（選抜フェーズ）指標の定義
export const RECRUITMENT_INTERVIEW_METRICS_DEFINITIONS: Record<string, MetricDefinition> = {
  interviewScheduled: {
    label: '面接予定数',
    definition: '対象週に面接が予定された件数',
    method: '以下の条件を満たす面接をカウント：\n• 採用管理シートの「面談予定日時」列（G列系）が対象週内に含まれる\n• 面接予定日時が土曜日〜金曜日の範囲内\n\n対象となる面接：\n• 一次面接・二次面接・最終面接\n• オンライン面接・対面面接\n• グループ面接・個人面接'
  },
  interviewConducted: {
    label: '面接実施数',
    definition: '対象週に面接が実際に実施された件数',
    method: '以下の条件を満たす面接をカウント：\n• 採用管理シートの「面談実施日」列（H列系）が対象週内に含まれる\n• 面接が実際に完了している状態\n\n実施完了の条件：\n• 面接が予定通りに実施された\n• 面接結果の記録が完了している\n• キャンセルや延期ではない'
  },
  interviewCancelled: {
    label: '面接辞退数',
    definition: '対象週に面接予定だったが辞退された件数',
    method: '以下の条件をすべて満たす面接をカウント：\n• 面談予定日時が対象週内\n• 採用管理シートの「現状ステータス」列が「面接不参加」または「面談不参加」\n\n辞退の理由：\n• 応募者都合による辞退\n• 連絡なしでの不参加\n• 急な体調不良や事情による辞退'
  },
  hireCount: {
    label: '採用者数',
    definition: '対象週に採用が決定された件数',
    method: '以下の条件をすべて満たす応募者をカウント：\n• 面談実施日が対象週内\n• 採用管理シートの「現状ステータス」列が「採用」\n\n採用決定の条件：\n• 面接を通過し、採用が正式に決定された'
  },
  offerAcceptedCount: {
    label: '内定受諾数',
    definition: '対象週に内定を受諾した件数',
    method: '以下の条件を満たす応募者をカウント：\n• 採用管理シートの「内定受諾日」列（I列）が対象週内\n• 内定を受諾している状態'
  },
  interviewRate: {
    label: '面接実施率',
    definition: '面接予定数に対する面接実施数の割合',
    method: '以下の計算式で算出：\n• (面接実施数 / 面接予定数) × 100\n\n注意事項：\n• 分母が0の場合は0%と表示\n• 小数点以下は四捨五入\n• 辞退や延期は実施数に含まれない'
  },
  acceptanceRate: {
    label: '内定受諾率',
    definition: '採用者数に対する内定受諾数の割合',
    method: '以下の計算式で算出：\n• (内定受諾数 / 採用者数) × 100\n\n注意事項：\n• 分母が0の場合は0%と表示\n• 小数点以下は四捨五入\n• 内定辞退は受諾数に含まれない'
  }
};