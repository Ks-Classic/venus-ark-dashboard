/**
 * 採用活動完全版レポート生成スクリプト
 * 全指標を計算し、フィルタ機能付き
 * スプレッドシートからの直接データ取得・集計
 * 
 * 対応シート:
 * - 採用管理シート: 1YCniJwv7BBR6zvrIu_tOL1dwDgNLIG-P-YM90yITrO4
 * - エントリーフォーム: 1lcjC-KOH8OD9Ar3J4XIPz62vSRLI7xfXCwKM2o7PRjY
 */

// 定数定義
const SPREADSHEET_IDS = {
  RECRUITMENT_MANAGEMENT: '1YCniJwv7BBR6zvrIu_tOL1dwDgNLIG-P-YM90yITrO4', // 採用管理シート
  ENTRY_FORM: '1lcjC-KOH8OD9Ar3J4XIPz62vSRLI7xfXCwKM2o7PRjY' // エントリーフォーム
};

// メニュー作成
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('採用活動レポート')
    .addItem('週次レポート生成', 'showWeeklyReportDialog')
    .addItem('フィルタ付きレポート', 'showFilteredReportDialog')
    .addItem('データ整合性チェック', 'checkDataIntegrity')
    .addItem('全週レポート一括生成', 'generateAllWeeksReport')
    .addToUi();
}

/**
 * 週次レポート生成ダイアログ表示
 */
function showWeeklyReportDialog() {
  const html = HtmlService.createTemplateFromFile('WeeklyReportDialog');
  html.weeks = generateWeekOptions();
  
  const template = html.evaluate()
    .setWidth(400)
    .setHeight(300);
  
  SpreadsheetApp.getUi().showModalDialog(template, '週次レポート生成');
}

/**
 * フィルタ付きレポートダイアログ表示
 */
function showFilteredReportDialog() {
  const html = HtmlService.createTemplateFromFile('FilteredReportDialog');
  html.weeks = generateWeekOptions();
  html.platforms = [
    { value: 'all', label: 'すべて' },
    { value: 'indeed', label: 'Indeed' },
    { value: 'engage', label: 'Engage' }
  ];
  html.jobCategories = [
    { value: 'all', label: 'すべて' },
    { value: '動画クリエイター', label: '動画クリエイター' },
    { value: '動画編集', label: '動画編集' },
    { value: 'AIライター', label: 'AIライター' },
    { value: 'ライター', label: 'ライター' },
    { value: '撮影スタッフ', label: '撮影スタッフ' },
    { value: 'SNS運用', label: 'SNS運用' }
  ];
  
  const template = html.evaluate()
    .setWidth(500)
    .setHeight(400);
  
  SpreadsheetApp.getUi().showModalDialog(template, 'フィルタ付きレポート生成');
}

/**
 * 週選択オプション生成
 */
function generateWeekOptions() {
  const weeks = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // 過去12週分を生成（新ルールで週の所属月を計算）
  for (let i = 0; i < 12; i++) {
    const weekDate = new Date(currentDate);
    weekDate.setDate(currentDate.getDate() - (i * 7));
    
    // 新ルールで週の開始日（土曜日）を計算
    const weekStart = getWeekStartFromAnyDate(weekDate);
    
    // 多数決で週が属する月を決定
    const assignedMonth = getAssignedMonthByMajority(weekStart);
    
    // その月内での週番号を計算
    const weekInMonth = getWeekNumberInAssignedMonth(assignedMonth.year, assignedMonth.month, weekStart);
    
    weeks.push({
      value: `${assignedMonth.month}月${weekInMonth}W`,
      label: `${assignedMonth.month}月${weekInMonth}W (${weekStart.getFullYear()}/${assignedMonth.month}/${weekStart.getDate()})`
    });
  }
  
  return weeks;
}

/**
 * フィルタ付きレポート生成
 */
function generateFilteredReport(weekSelector, platform, jobCategory) {
  try {
    console.log('🔍 generateFilteredReport 開始');
    console.log(`📅 週選択子: ${weekSelector}`);
    console.log(`🌐 プラットフォーム: ${platform}`);
    console.log(`💼 職種: ${jobCategory}`);
    
    const weekRange = getWeekDateRange(weekSelector);
    console.log(`📅 週範囲: ${weekRange.start} 〜 ${weekRange.end}`);
    
    // 採用管理シートに直接アクセス
    console.log('📊 スプレッドシートアクセス開始');
    console.log(`🆔 対象スプレッドシートID: ${SPREADSHEET_IDS.RECRUITMENT_MANAGEMENT}`);
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_IDS.RECRUITMENT_MANAGEMENT);
    
    if (!spreadsheet) {
      console.log('❌ スプレッドシートオブジェクトがnullです');
      throw new Error('スプレッドシートの取得に失敗しました');
    }
    
    console.log(`✅ スプレッドシート取得成功: ${spreadsheet.getName()}`);
    console.log(`🆔 スプレッドシートID: ${spreadsheet.getId()}`);
    
    // プラットフォームフィルタ
    console.log('🔍 プラットフォームフィルタ開始');
    let targetSheets = [];
    
    try {
      const allSheets = spreadsheet.getSheets();
      console.log(`📋 全シート数: ${allSheets.length}`);
      allSheets.forEach((sheet, index) => {
        console.log(`  ${index + 1}. ${sheet.getName()} (${sheet.getLastRow()}行)`);
      });
      
      if (platform === 'all') {
        targetSheets = allSheets;
        console.log('✅ 全プラットフォームを対象とします');
      } else if (platform === 'indeed') {
        targetSheets = allSheets.filter(sheet => 
          sheet.getName().includes('indeed応募者管理')
        );
        console.log(`✅ Indeedシート数: ${targetSheets.length}`);
      } else if (platform === 'engage') {
        targetSheets = allSheets.filter(sheet => 
          sheet.getName().includes('engageその他応募者管理')
        );
        console.log(`✅ Engageシート数: ${targetSheets.length}`);
      }
    } catch (sheetsError) {
      console.log(`❌ シート取得エラー: ${sheetsError.message}`);
      throw new Error(`シート取得に失敗: ${sheetsError.message}`);
    }
    
    // 職種フィルタ
    console.log('🔍 職種フィルタ開始');
    if (jobCategory !== 'all') {
      const beforeFilterCount = targetSheets.length;
      const keywords = getJobCategoryKeywords(jobCategory);
      targetSheets = targetSheets.filter(sheet => {
        const name = sheet.getName();
        return keywords.some(k => name.indexOf(k) !== -1);
      });
      console.log(`✅ 職種フィルタ適用: ${beforeFilterCount} → ${targetSheets.length}シート`);
    }
    
    console.log(`📋 最終対象シート数: ${targetSheets.length}`);
    
    // 各指標を計算
    console.log('🔄 指標計算開始');
    const metrics = calculateAllMetrics(targetSheets, weekRange);
    console.log('✅ 指標計算完了');
    
    // 新ルール：週セレクタと実際の週情報の差異をログ出力
    const weekInfo = getWeekInfoFromSelector(weekSelector);
    console.log(`[WEEK-INFO] セレクタ: ${weekSelector}, 実際の週: ${weekInfo.actualMonth}月${weekInfo.actualWeek}W`);
    
    const result = {
      success: true,
      week: weekSelector,
      dateRange: `${weekRange.start} 〜 ${weekRange.end}`,
      platform: platform,
      jobCategory: jobCategory,
      metrics: metrics
    };
    
    console.log('✅ generateFilteredReport 正常完了');
    return result;
    
  } catch (error) {
    console.log(`❌ generateFilteredReport エラー: ${error.message}`);
    console.log(`📋 エラースタック: ${error.stack}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 職種のシノニム/別名を吸収してフィルタキーワード配列を返す
 */
function getJobCategoryKeywords(jobCategory) {
  const key = String(jobCategory || '').toLowerCase();
  if (key.indexOf('動画') !== -1 || key.indexOf('video') !== -1) {
    return ['動画', '動画編集', '動画クリエイター', 'video'];
  }
  if (key.indexOf('ai') !== -1 || key.indexOf('ライター') !== -1 || key.indexOf('writer') !== -1) {
    return ['AIライター', 'ライター', 'writer'];
  }
  if (key.indexOf('sns') !== -1 || key.indexOf('運用') !== -1) {
    return ['SNS運用', 'sns'];
  }
  if (key.indexOf('撮影') !== -1 || key.indexOf('photo') !== -1) {
    return ['撮影スタッフ', '撮影', 'photo'];
  }
  return [jobCategory];
}

/**
 * ステータス列の別名を吸収して統一化したステータス文字列を返す
 */
function getStatusFromRow(row, headerMap) {
  const raw = (row[headerMap['ステータス']] || row[headerMap['現状ステータス']] || row[headerMap['選考状況']] || '').toString();
  return raw;
}

// 採用管理（職種別）→ 応募フォーム側のシート名マッピング
function getFormSheetNamesForRecruitmentSheet(sheetName) {
  // engage系はダブルカウント防止のため常にフォーム対象外（0件）
  if (sheetName && sheetName.indexOf('engage') !== -1) {
    return [];
  }
  const map = {
    'indeed応募者管理(動画編集)': ['動画_indeedその他経由'],
    'engageその他応募者管理(動画編集)': ['動画_indeedその他経由'],
    'indeed応募者管理(ライター/AIライター)': ['AIライター'],
    'engageその他応募者管理(ライター/AIライター)': ['AIライター'],
    'indeed応募者管理(撮影スタッフ)': ['動画撮影スタッフ_indeedその他経由'],
    'indeed応募者管理(SNS運用)': ['SNS運用_indeedその他経由'],
    'engageその他応募者管理(SNS運用)': ['SNS運用_indeedその他経由']
  };
  return map[sheetName] || [];
}

// ENTRY FORM: インデックス構築（対象フォームシートを限定可）
function buildEntryFormTimestampIndex(targetFormSheets) {
  const index = {};
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_IDS.ENTRY_FORM);
  const sheets = spreadsheet.getSheets();
  if (Array.isArray(targetFormSheets) && targetFormSheets.length === 0) {
    return index; // 対象なし
  }
  const useSheets = targetFormSheets && targetFormSheets.length > 0
    ? sheets.filter(function(s){ return targetFormSheets.indexOf(s.getName()) !== -1; })
    : sheets;
  useSheets.forEach(sheet => {
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;
    const headers = data[0];
    const nameIdx = headers.findIndex(h => h === '名前');
    const tsIdx = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const n = normalizeName(nameIdx !== -1 ? row[nameIdx] : '');
      const ts = row[tsIdx];
      if (!n || !ts) continue;
      if (!index[n]) index[n] = [];
      const dt = ts instanceof Date ? ts : new Date(ts);
      if (!isNaN(dt.getTime())) index[n].push(dt);
    }
  });
  Object.keys(index).forEach(k => index[k].sort(function(a,b){return a-b;}));
  return index;
}

// ENTRY FORM: 直接週内提出数をカウント（対象フォームシートを限定可）
function countFormSubmissionsInWeekDirect(startDate, endDate, targetFormSheets) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_IDS.ENTRY_FORM);
  const sheets = spreadsheet.getSheets();
  if (Array.isArray(targetFormSheets) && targetFormSheets.length === 0) {
    return 0; // 対象なし
  }
  const useSheets = targetFormSheets && targetFormSheets.length > 0
    ? sheets.filter(function(s){ return targetFormSheets.indexOf(s.getName()) !== -1; })
    : sheets;
  let count = 0;
  useSheets.forEach(sheet => {
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;
    for (let i = 1; i < data.length; i++) {
      const ts = data[i][0];
      if (isDateInRange(ts, startDate, endDate)) {
        count++;
      }
    }
  });
  return count;
}

/**
 * 全指標を計算（添付画像のレポート形式に完全対応）
 */
function calculateAllMetrics(sheets, weekRange) {
  try {
    console.log('🔍 calculateAllMetrics 開始');
    console.log(`📋 対象シート数: ${sheets.length}`);
    console.log(`📅 週範囲: ${weekRange.start} 〜 ${weekRange.end}`);
    
    const startDate = weekRange.start;
    const endDate = weekRange.end;
    
    let totalApplyCount = 0;
    let totalDocumentSubmitted = 0;
    let totalInterviewScheduled = 0;
    let totalInterviewConducted = 0;
    let totalHired = 0;
    let totalAccepted = 0;
    let totalApplyRejected = 0; // 応募内不採用数（C列の「応募落ち」のみ）
    let totalDocRejected = 0;   // 書類内不採用数（「書類落ち」等）
    let totalInterviewCancelled = 0;
    let totalLeft = 0;
    
    const rejectionBreakdown = {
      experience: 0,      // 経験者
      age: 0,            // 高齢
      unfit: 0,          // 不適合
      foreign: 0,        // 外国籍
      relocation: 0,     // 転居確認（集計から除外要件に基づき、後で0固定）
      declined: 0,       // 採用辞退（内定後辞退）
      other: 0           // その他
    };
    
    // シート別の詳細集計
    const sheetDetails = [];
    
    // 対象フォームシートの集合（採用管理シート名→フォームシート名のマッピングで限定）
    const formSheetSet = {};
    sheets.forEach(s => {
      getFormSheetNamesForRecruitmentSheet(s.getName()).forEach(n => formSheetSet[n] = true);
    });
    const targetFormSheets = Object.keys(formSheetSet);
    console.log('📋 対象フォームシート:', JSON.stringify(targetFormSheets));

    // Entry Form インデックスを構築（正規化名 -> タイムスタンプ配列）
    const entryFormIndex = buildEntryFormTimestampIndex(targetFormSheets);

    // 週内の書類提出数（フォームのタイムスタンプ基準）
    totalDocumentSubmitted = countFormSubmissionsInWeekDirect(startDate, endDate, targetFormSheets);

    // 1. 採用管理シートから応募数とその他の指標を計算
    console.log('📊 採用管理シートの処理開始');
    sheets.forEach((sheet, sheetIndex) => {
      try {
        const sheetName = sheet.getName();
        console.log(`  📋 シート${sheetIndex + 1}: ${sheetName}`);
        
        // 応募フォームシートは除外（別途処理）
        if (sheetName === '応募フォーム') {
          console.log(`    ⏭️ 応募フォームシートをスキップ`);
          return;
        }
        
        const data = sheet.getDataRange().getValues();
        console.log(`    📊 データ行数: ${data.length}`);
        
        if (data.length <= 1) {
          console.log(`    ⚠️ データが不足しています（ヘッダーのみ）`);
          return;
        }
        
        const headers = data[0];
        console.log(`    📋 ヘッダー: ${headers.join(', ')}`);
        
        // ヘッダーのインデックスを取得
        const headerMap = {};
        headers.forEach((header, index) => {
          headerMap[header] = index;
        });
        
        // 各行を処理
        let sheetApplyCount = 0;
        let sheetInterviewScheduled = 0;
        let sheetInterviewConducted = 0;
        let sheetHired = 0;
        let sheetAccepted = 0;
        let sheetRejected = 0;
        let sheetDocRejected = 0;
        let sheetInterviewCancelled = 0;
        let sheetLeft = 0;
        
        for (let i = 1; i < data.length; i++) {
          try {
            const row = data[i];
            const applicationDate = row[headerMap['応募日']] || row[headerMap['応募日時']];
            const status = getStatusFromRow(row, headerMap);
            
            // 応募系は応募日で週判定
            if (isDateInRange(applicationDate, startDate, endDate)) {
              totalApplyCount++;
              sheetApplyCount++;
              
              // 応募内不採用数: 「応募落ち」のみ
              if (status && status.indexOf('応募落ち') !== -1) {
                totalApplyRejected++;
                sheetRejected++;
              }
            }

            // 面接予定数: 面談予定日時/G列基準（応募日で絞らない）
            const interviewDate = row[headerMap['面談予定日時']] || row[headerMap['面接予定日']] || row[headerMap['面接日']];
            if (interviewDate && isDateInRange(interviewDate, startDate, endDate)) {
              totalInterviewScheduled++;
              sheetInterviewScheduled++;
            }
            
            // 面接実施数: 面談実施日/H列基準
            const interviewImplementedDate = row[headerMap['面談実施日']] || row[headerMap['面接実施日']] || row[headerMap['面談完了日']] || row[headerMap['面接完了日']];
            if (interviewImplementedDate && isDateInRange(interviewImplementedDate, startDate, endDate)) {
              totalInterviewConducted++;
              sheetInterviewConducted++;
            }

            // 採用者数: 面談実施日が対象週 かつ ステータスが「採用」
            if (interviewImplementedDate && isDateInRange(interviewImplementedDate, startDate, endDate) && status.includes('採用')) {
              totalHired++;
              sheetHired++;
            }

            // 内定受諾数: 面談実施日が対象週のものを1件としてカウント（検算ロジックに合わせる）
            const acceptanceDate = row[headerMap['内定受諾日']] || row[headerMap['承諾日']] || row[headerMap['内定承諾日']];
            if (interviewImplementedDate && isDateInRange(interviewImplementedDate, startDate, endDate)) {
              totalAccepted++;
              sheetAccepted++;
            }

            // 面接辞退数: G列が対象週 かつ ステータスが「面接不参加」/「面談不参加」
            if (interviewDate && isDateInRange(interviewDate, startDate, endDate)) {
              if (status.includes('面接不参加') || status.includes('面談不参加')) {
                totalInterviewCancelled++;
                sheetInterviewCancelled++;
              }
            }

            // 書類不採用: ステータス「書類落ち/書類不採用」かつ
            // エントリーフォームのタイムスタンプが対象週に入るもののみカウント
            if (status.includes('書類不採用') || status.includes('書類落ち')) {
              const nameValue = row[headerMap['名前']] || row[headerMap['氏名']] || row[headerMap['応募者名']] || '';
              const normalized = normalizeName(nameValue);
              const stamps = entryFormIndex[normalized] || [];
              const matched = findNearestTimestampWithinWindow(stamps, applicationDate, 30);
              if (matched && isDateInRange(matched, startDate, endDate)) {
                totalDocRejected++;
                sheetDocRejected++;
              }
            }

            // 離脱/辞退（参考値）
            if (status.includes('離脱') || status.includes('辞退')) {
              totalLeft++;
              sheetLeft++;
            }

            // 不採用理由内訳（応募日が対象週で、応募落ち/書類落ち/不採用/採用辞退系のみ。転居系は除外）
            const rejectionReason = (row[headerMap['不採用理由']] || row[headerMap['理由']] || '').toString();
            if (isDateInRange(applicationDate, startDate, endDate)) {
              if (status.includes('不採用') || status.includes('採用辞退') || status.includes('書類落ち') || status.includes('応募落ち')) {
                if (rejectionReason) {
                  if (rejectionReason.includes('経験者') || rejectionReason.includes('経験')) {
                    rejectionBreakdown.experience++;
                  } else if (rejectionReason.includes('高齢') || rejectionReason.includes('年齢')) {
                    rejectionBreakdown.age++;
                  } else if (rejectionReason.includes('不適合') || rejectionReason.includes('ミスマッチ')) {
                    rejectionBreakdown.unfit++;
                  } else if (rejectionReason.includes('外国籍') || rejectionReason.includes('国籍')) {
                    rejectionBreakdown.foreign++;
                  } else if (rejectionReason.includes('辞退') || rejectionReason.includes('内定後') || rejectionReason.includes('採用辞退')) {
                    rejectionBreakdown.declined++;
                  } else if (!(rejectionReason.includes('転居') || rejectionReason.includes('引っ越し') || rejectionReason.includes('上京'))) {
                    rejectionBreakdown.other++;
                  }
                }
              }
            }
          } catch (rowError) {
            console.log(`    ⚠️ 行${i + 1}の処理でエラー: ${rowError.message}`);
          }
        }
        
        // シート別の詳細を記録
        if (sheetApplyCount > 0) {
          sheetDetails.push({
            sheetName: sheetName,
            applyCount: sheetApplyCount,
            interviewScheduled: sheetInterviewScheduled,
            interviewConducted: sheetInterviewConducted,
            hired: sheetHired,
            accepted: sheetAccepted,
            rejected: sheetRejected,
            docRejected: sheetDocRejected,
            interviewCancelled: sheetInterviewCancelled,
            left: sheetLeft
          });
        }
        
        console.log(`    ✅ シート処理完了: 応募数${sheetApplyCount}件`);
        
      } catch (sheetError) {
        console.log(`  ❌ シート${sheetIndex + 1}の処理でエラー: ${sheetError.message}`);
      }
    });
    
    console.log(`📊 採用管理シート処理完了: 総応募数${totalApplyCount}件`);
    console.log('📋 シート別詳細:', sheetDetails);
    
    // 2. 応募フォームシートから書類提出数は上で算出済み
    console.log(`📋 エントリーフォーム処理完了: 書類提出数${totalDocumentSubmitted}件`);
    
    // 3. 計算値（添付画像の形式に完全対応）
    console.log('🧮 計算値の算出開始');
    // 選考継続(応募): 「フォーム回答待ち」の実数
    const applyContinueCount = (function() {
      let count = 0;
      sheets.forEach(sheet => {
        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) return;
        const headers = data[0];
        const headerMap = {};
        headers.forEach((h, idx) => headerMap[h] = idx);
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const applicationDate = row[headerMap['応募日']] || row[headerMap['応募日時']];
          const status = (row[headerMap['ステータス']] || row[headerMap['現状ステータス']] || '').toString();
          if (isDateInRange(applicationDate, startDate, endDate) && status.includes('フォーム回答待ち')) {
            count++;
          }
        }
      });
      return count;
    })();
    const documentContinueCount = totalDocumentSubmitted - totalDocRejected;
    
    // 面接実施率の計算（分母が0の場合は0%）
    let interviewRate = 0;
    if (totalInterviewScheduled > 0) {
      interviewRate = Math.round((totalInterviewConducted / totalInterviewScheduled) * 1000) / 10;
    }
    
    // 内定受諾率の計算（分母が0の場合は0%）
    let acceptanceRate = 0;
    if (totalHired > 0) {
      acceptanceRate = Math.round((totalAccepted / totalHired) * 1000) / 10;
    }
    
    const result = {
      // 集客指標
      applyCount: totalApplyCount,
      applyRejectCount: totalApplyRejected,
      applyContinueCount: applyContinueCount,
      documentSubmitted: totalDocumentSubmitted,
      documentRejectCount: totalDocRejected,
      documentContinueCount: documentContinueCount,
      
      // 面接指標
      interviewScheduled: totalInterviewScheduled,
      interviewConducted: totalInterviewConducted,
      interviewCancelled: totalInterviewCancelled,
      hireCount: totalHired,
      offerAcceptedCount: totalAccepted,
      
      // 計算値
      interviewRate: interviewRate,
      acceptanceRate: acceptanceRate,
      
      // 不採用理由内訳（添付画像の分類に完全対応）
      rejectionBreakdown: rejectionBreakdown,
      
      // その他
      left: totalLeft,
      
      // シート別詳細（新規追加）
      sheetDetails: sheetDetails
    };
    
    console.log('✅ calculateAllMetrics 正常完了');
    console.log(`📊 最終結果:`, result);
    return result;
    
  } catch (error) {
    console.log(`❌ calculateAllMetrics エラー: ${error.message}`);
    console.log(`📋 エラースタック: ${error.stack}`);
    throw error;
  }
}

/**
 * 応募フォームシートから書類提出数を抽出
 */
function getDocumentSubmissionCountFromFormSheet(weekRange) {
  try {
    console.log('📋 エントリーフォーム処理開始');
    
    // エントリーフォームのスプレッドシートにアクセス
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_IDS.ENTRY_FORM);
    console.log(`✅ エントリーフォームスプレッドシートにアクセス成功: ${spreadsheet.getName()}`);
    
    // 利用可能なシートを確認
    const allSheets = spreadsheet.getSheets();
    console.log(`📋 利用可能なシート数: ${allSheets.length}`);
    allSheets.forEach((sheet, index) => {
      console.log(`  ${index + 1}. ${sheet.getName()}`);
    });
    
    // シート名の候補を試す（エントリーフォームの実際のシート名に基づく）
    const possibleSheetNames = [
      '求人エントリーフォーム_株式会社VenusArk（回答）',  // 実際のシート名
      'フォームの回答 1',
      '応募フォーム', 
      'フォーム回答', 
      '回答'
    ];
    
    let formSheet = null;
    let foundSheetName = '';
    
    for (const sheetName of possibleSheetNames) {
      formSheet = spreadsheet.getSheetByName(sheetName);
      if (formSheet) {
        foundSheetName = sheetName;
        console.log(`✅ シート「${sheetName}」を発見`);
        break;
      }
    }
    
    if (!formSheet) {
      console.log('❌ エントリーフォームシートが見つかりません');
      console.log('利用可能なシート:', allSheets.map(s => s.getName()));
      return 0;
    }
    
    const data = formSheet.getDataRange().getValues();
    console.log(`📊 エントリーフォームデータ行数: ${data.length}`);
    
    if (data.length <= 1) {
      console.log('⚠️ エントリーフォームにデータがありません');
      return 0;
    }
    
    const headers = data[0];
    console.log(`📋 エントリーフォームヘッダー: ${headers.join(', ')}`);
    
    // タイムスタンプ列のインデックスを取得（A列の「タイムスタンプ」）
    const timestampIndex = 0; // A列は固定
    console.log(`✅ タイムスタンプ列「${headers[timestampIndex]}」を使用 (列${timestampIndex + 1})`);
    
    // 名前列のインデックスを取得
    const nameIndex = headers.findIndex(h => h === '名前');
    if (nameIndex === -1) {
      console.log('⚠️ 名前列が見つかりません');
    } else {
      console.log(`✅ 名前列「${headers[nameIndex]}」を使用 (列${nameIndex + 1})`);
    }
    
    let submissionCount = 0;
    const startDate = new Date(weekRange.start);
    const endDate = new Date(weekRange.end);
    
    console.log(`📅 対象期間: ${startDate.toISOString()} 〜 ${endDate.toISOString()}`);
    
    // 各行のタイムスタンプをチェック
    for (let i = 1; i < data.length; i++) {
      try {
        const timestamp = data[i][timestampIndex];
        const name = nameIndex !== -1 ? data[i][nameIndex] : '名前なし';
        
        if (timestamp && isDateInRange(timestamp, startDate, endDate)) {
          submissionCount++;
          console.log(`  📝 書類提出: ${timestamp} - ${name}`);
        }
      } catch (rowError) {
        console.log(`  ⚠️ 行${i + 1}の処理でエラー: ${rowError.message}`);
      }
    }
    
    console.log(`📋 エントリーフォーム: ${weekRange.start}〜${weekRange.end} の書類提出数: ${submissionCount}件`);
    return submissionCount;
    
  } catch (error) {
    console.log(`❌ エントリーフォーム処理エラー: ${error.message}`);
    console.log(`📋 エラースタック: ${error.stack}`);
    return 0;
  }
}

/**
 * 正規化名を生成
 */
function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .replace(/[\s\u3000]/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s){return String.fromCharCode(s.charCodeAt(0)-0xFEE0);})
    .toLowerCase();
}

/**
 * エントリーフォームのインデックスを構築: 正規化名 -> タイムスタンプ配列
 */
function buildEntryFormTimestampIndex() {
  const index = {};
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_IDS.ENTRY_FORM);
  const sheet = spreadsheet.getSheetByName('求人エントリーフォーム_株式会社VenusArk（回答）') || spreadsheet.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return index;
  const headers = data[0];
  const nameIdx = headers.findIndex(h => h === '名前');
  const tsIdx = 0; // タイムスタンプ(A)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const n = normalizeName(nameIdx !== -1 ? row[nameIdx] : '');
    const ts = row[tsIdx];
    if (!n || !ts) continue;
    if (!index[n]) index[n] = [];
    index[n].push(new Date(ts));
  }
  // 各配列を昇順ソート
  Object.keys(index).forEach(k => index[k].sort((a,b)=>a-b));
  return index;
}

/**
 * 応募フォームのタイムスタンプのうち、対象週に入る件数を数える
 */
function countFormSubmissionsInWeek(entryFormIndex, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  Object.values(entryFormIndex).forEach(arr => {
    arr.forEach(d => { if (d >= start && d <= end) count++; });
  });
  return count;
}

/**
 * 応募日近接(±days)で最も近いフォームタイムスタンプを返す
 */
function findNearestTimestampWithinWindow(timestamps, applicationDate, days) {
  if (!applicationDate || !timestamps || timestamps.length === 0) return null;
  const base = new Date(applicationDate).getTime();
  const windowMs = days * 24 * 60 * 60 * 1000;
  let best = null; let bestDiff = Infinity;
  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i].getTime();
    const diff = Math.abs(t - base);
    if (diff <= windowMs && diff < bestDiff) { best = new Date(timestamps[i]); bestDiff = diff; }
  }
  return best;
}

/**
 * 週の日付範囲を計算（土曜日〜金曜日）
 */
function getWeekDateRange(weekSelector) {
  const match = weekSelector.match(/(\d+)月(\d+)W/);
  if (!match) throw new Error('週選択の形式が正しくありません（例: 8月2W）');
  
  const month = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  // year は doGet/doPost からのパラメータがあればそちらを使う。なければ当年。
  const ctx = (typeof globalThis !== 'undefined' && globalThis.__WEEK_CTX__) || {};
  const year = ctx.year || new Date().getFullYear();

  // 新ルール：
  // 1) 週は土曜開始・金曜終了
  // 2) 「月の第1週」は、その月の1日を含む週（＝1日の直前の土曜日が開始日）
  // 3) N週目は基準週＋(N-1)*7日
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeek = firstDayOfMonth.getUTCDay(); // 0:Sun ... 6:Sat
  const daysToSubtract = (firstDayOfWeek + 1) % 7; // 土曜=6 → 0、日曜=0 → 1
  const firstWeekStartDate = new Date(firstDayOfMonth);
  firstWeekStartDate.setUTCDate(1 - daysToSubtract);

  const targetWeekStartDate = new Date(firstWeekStartDate);
  targetWeekStartDate.setUTCDate(firstWeekStartDate.getUTCDate() + (week - 1) * 7);

  const start = targetWeekStartDate;
  const end = new Date(targetWeekStartDate);
  end.setUTCDate(targetWeekStartDate.getUTCDate() + 6);

  // 新ルール：実際に返す週の情報を多数決で決定
  const actualAssignedMonth = getAssignedMonthByMajority(start);
  
  // デバッグログ：要求された週と実際の週の差異を出力
  if (actualAssignedMonth.month !== month) {
    console.log(`[WEEK-DEFINITION-MISMATCH] 要求: ${month}月${week}W → 実際: ${actualAssignedMonth.month}月${week}W`);
    console.log(`  週範囲: ${start.toISOString().split('T')[0]} 〜 ${end.toISOString().split('T')[0]}`);
    console.log(`  月別日数: ${JSON.stringify(getMonthDayCounts(start))}`);
  }

  return {
    start: formatDate(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))),
    end: formatDate(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())))
  };
}

/**
 * 日付が範囲内かチェック（ローカル日付のYYYYMMDD比較でタイムゾーン影響を排除）
 */
function isDateInRange(date, startDate, endDate) {
  if (!date) return false;
  
  const targetYmd = toYmdNumber(date);
  const startYmd = toYmdFromStringOrDate(startDate);
  const endYmd = toYmdFromStringOrDate(endDate);
  
  return !isNaN(targetYmd) && !isNaN(startYmd) && !isNaN(endYmd)
    ? (targetYmd >= startYmd && targetYmd <= endYmd)
    : false;
}

/**
 * 任意の日時をローカル日付のYYYYMMDD数値に変換
 */
function toYmdNumber(d) {
  // Date オブジェクトならタイムゾーンを固定してYYYYMMDDを生成
  if (d instanceof Date) {
    try {
      const tz = (typeof Session !== 'undefined' && Session.getScriptTimeZone) ? (Session.getScriptTimeZone() || 'Asia/Tokyo') : 'Asia/Tokyo';
      const s = Utilities.formatDate(d, tz, 'yyyyMMdd');
      return parseInt(s, 10);
    } catch (e) {
      // フォールバック
      return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    }
  }
  
  // 文字列フォーマットを柔軟に解釈（YYYY-MM-DD / YYYY/MM/DD / YYYY.M.D など）
  if (typeof d === 'string') {
    const s = d.trim();
    let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10);
      const da = parseInt(m[3], 10);
      return y * 10000 + mo * 100 + da;
    }
    // それ以外はDateとして解釈してYMD化
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) return toYmdNumber(dt);
    return NaN;
  }
  
  // 数値などその他はDateとして試行
  const dt = new Date(d);
  if (!isNaN(dt.getTime())) return toYmdNumber(dt);
  return NaN;
}

/**
 * 文字列(YYYY-MM-DD)またはDateをYYYYMMDD数値へ
 */
function toYmdFromStringOrDate(v) {
  if (typeof v === 'string') {
    // ハイフン/スラッシュ/ドット対応
    const m = v.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (m) {
      return parseInt(m[1], 10) * 10000 + parseInt(m[2], 10) * 100 + parseInt(m[3], 10);
    }
    return toYmdNumber(v);
  }
  return toYmdNumber(v);
}

/**
 * 日付を文字列にフォーマット
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 週次レポート生成（API用）
 */
function generateWeeklyReport(weekSelector) {
  return generateFilteredReport(weekSelector, 'all', 'all');
}

/**
 * Web App用のGET関数（Next.jsからの呼び出し用）
 */
function doGet(e) {
  try {
    console.log('🔍 GAS doGet 開始');
    console.log('📋 リクエストパラメータ:', JSON.stringify(e.parameter));
    
    // パラメータを取得
    const params = e.parameter;
    const weekSelector = params.week || params.weekSelector;
    const platform = params.platform || 'all';
    const jobCategory = params.jobCategory || 'all';
    const yearParam = params.year ? parseInt(params.year, 10) : undefined;
    
    console.log('📅 週選択子:', weekSelector);
    console.log('🌐 プラットフォーム:', platform);
    console.log('💼 職種:', jobCategory);
    
    if (!weekSelector) {
      console.log('❌ 週選択子が不足');
      return ContentService
        .createTextOutput(JSON.stringify({ 
          error: '週選択が必要です',
          success: false 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // スプレッドシートの状態を確認（スプレッドシートIDを直接指定）
    console.log('📊 スプレッドシート状態確認開始');
    
    let spreadsheet = null;
    let spreadsheetName = 'Unknown';
    let spreadsheetId = 'Unknown';
    
    try {
      // 方法1: 採用管理シートを直接指定（最優先）
      const MAIN_SPREADSHEET_ID = SPREADSHEET_IDS.RECRUITMENT_MANAGEMENT;
      spreadsheet = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID);
      if (spreadsheet) {
        console.log('✅ 方法1成功: 採用管理シートから直接取得');
      }
    } catch (error1) {
      console.log('⚠️ 方法1失敗:', error1.message);
    }
    
    if (!spreadsheet) {
      try {
        // 方法2: アクティブなスプレッドシートを取得（フォールバック）
        spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        if (spreadsheet) {
          console.log('✅ 方法2成功: SpreadsheetApp.getActiveSpreadsheet()');
        }
      } catch (error2) {
        console.log('⚠️ 方法2失敗:', error2.message);
      }
    }
    
    if (!spreadsheet) {
      try {
        // 方法3: 環境変数からスプレッドシートIDを取得
        const spreadsheetIdFromEnv = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
        if (spreadsheetIdFromEnv) {
          spreadsheet = SpreadsheetApp.openById(spreadsheetIdFromEnv);
          console.log('✅ 方法3成功: 環境変数から取得');
        }
      } catch (error3) {
        console.log('⚠️ 方法3失敗:', error3.message);
      }
    }
    
    if (!spreadsheet) {
      console.log('❌ すべての方法でスプレッドシートの取得に失敗');
      return ContentService
        .createTextOutput(JSON.stringify({ 
          error: 'スプレッドシートにアクセスできません。Web Appとして実行されているか確認してください。',
          success: false,
          debug: {
            hasSpreadsheet: false,
            error: 'All methods to get spreadsheet failed',
            scriptId: ScriptApp.getScriptId(),
            activeUser: Session.getActiveUser().getEmail(),
            availableProperties: PropertiesService.getScriptProperties().getProperties()
          }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    console.log('✅ スプレッドシート取得成功');
    spreadsheetName = spreadsheet.getName();
    spreadsheetId = spreadsheet.getId();
    console.log('📄 スプレッドシート名:', spreadsheetName);
    console.log('🆔 スプレッドシートID:', spreadsheetId);
    
    const sheets = spreadsheet.getSheets();
    console.log('📋 シート数:', sheets.length);
    sheets.forEach((sheet, index) => {
      console.log(`  ${index + 1}. ${sheet.getName()} (${sheet.getLastRow()}行)`);
    });
    
    // レポート生成
    console.log('🔄 レポート生成開始');
    // 週計算で参照する年コンテキストを設定
    globalThis.__WEEK_CTX__ = { year: yearParam || new Date().getFullYear() };
    const result = generateFilteredReport(weekSelector, platform, jobCategory);
    console.log('✅ レポート生成完了:', JSON.stringify(result, null, 2));
    
    // JSONレスポンスを返す
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: result,
        debug: {
          hasSpreadsheet: true,
          spreadsheetName: spreadsheetName,
          spreadsheetId: spreadsheetId,
          sheetCount: sheets.length,
          weekSelector: weekSelector,
          platform: platform,
          jobCategory: jobCategory,
          scriptId: ScriptApp.getScriptId(),
          activeUser: Session.getActiveUser().getEmail()
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('❌ GAS doGet エラー:', error);
    console.error('📋 エラースタック:', error.stack);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: error.message,
        success: false,
        debug: {
          errorType: error.constructor.name,
          errorStack: error.stack,
          timestamp: new Date().toISOString(),
          scriptId: ScriptApp.getScriptId(),
          activeUser: Session.getActiveUser().getEmail()
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Web App用のPOST関数（Next.jsからの呼び出し用）
 */
function doPost(e) {
  try {
    // POSTデータを取得
    const postData = e.postData.contents;
    const data = JSON.parse(postData);
    
    const weekSelector = data.weekSelector;
    const platform = data.platform || 'all';
    const jobCategory = data.jobCategory || 'all';
    const yearParam = typeof data.year === 'number' ? data.year : (data.year ? parseInt(String(data.year), 10) : undefined);
    
    if (!weekSelector) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          error: '週選択が必要です',
          success: false 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 週計算で参照する年コンテキストを設定
    globalThis.__WEEK_CTX__ = { year: yearParam || new Date().getFullYear() };
    // レポート生成
    const result = generateFilteredReport(weekSelector, platform, jobCategory);
    
    // JSONレスポンスを返す
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: error.message,
        success: false 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * データ整合性チェック
 */
function checkDataIntegrity() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = spreadsheet.getSheets();
    
    let report = '=== データ整合性チェック結果 ===\n\n';
    
    sheets.forEach(sheet => {
      const sheetName = sheet.getName();
      if (sheetName === '応募フォーム') return; // 応募フォームシートは除外
      
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        report += `⚠️ ${sheetName}: データが不足しています\n`;
        return;
      }
      
      const headers = data[0];
      const requiredColumns = ['応募日', '現状ステータス', '名前'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        report += `❌ ${sheetName}: 不足している列: ${missingColumns.join(', ')}\n`;
      } else {
        report += `✅ ${sheetName}: 必要な列が揃っています\n`;
      }
      
      // データ件数チェック
      const dataRows = data.length - 1;
      report += `   データ件数: ${dataRows}件\n`;
      
      // 日付データの整合性チェック
      const dateColumnIndex = headers.findIndex(h => h === '応募日');
      if (dateColumnIndex !== -1) {
        let validDates = 0;
        let invalidDates = 0;
        
        for (let i = 1; i < data.length; i++) {
          const dateValue = data[i][dateColumnIndex];
          if (dateValue && isValidDate(dateValue)) {
            validDates++;
          } else if (dateValue) {
            invalidDates++;
          }
        }
        
        report += `   有効な日付: ${validDates}件, 無効な日付: ${invalidDates}件\n`;
      }
      
      report += '\n';
    });
    
    // 結果を表示
    SpreadsheetApp.getUi().alert('データ整合性チェック', report, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('エラー', 'データ整合性チェック中にエラーが発生しました: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 全週レポート一括生成
 */
function generateAllWeeksReport() {
  try {
    const weeks = generateWeekOptions();
    let allReports = [];
    
    weeks.forEach(week => {
      const report = generateFilteredReport(week.value, 'all', 'all');
      if (report.success) {
        allReports.push(report);
      }
    });
    
    // 結果を新しいシートに出力
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const reportSheet = spreadsheet.getSheetByName('全週レポート') || spreadsheet.insertSheet('全週レポート');
    
    // ヘッダー行を作成
    const headers = [
      '週', '期間', '応募数', '書類提出数', '面接予定数', '面接実施数', 
      '採用者数', '内定受諾数', '応募不採用数', '書類不採用数', 
      '面接辞退数', '離脱数', '継続応募数', '継続書類数', 
      '面接率(%)', '受諾率(%)'
    ];
    
    reportSheet.clear();
    reportSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // データ行を作成
    const reportData = allReports.map(report => [
      report.week,
      report.dateRange,
      report.metrics.applyCount,
      report.metrics.documentSubmitted,
      report.metrics.interviewScheduled,
      report.metrics.interviewConducted,
      report.metrics.hired,
      report.metrics.accepted,
      report.metrics.applyRejected,
      report.metrics.docRejected,
      report.metrics.interviewCancelled,
      report.metrics.left,
      report.metrics.applyContinueCount,
      report.metrics.documentContinueCount,
      report.metrics.interviewRate,
      report.metrics.acceptanceRate
    ]);
    
    if (reportData.length > 0) {
      reportSheet.getRange(2, 1, reportData.length, headers.length).setValues(reportData);
    }
    
    SpreadsheetApp.getUi().alert('完了', `${allReports.length}週分のレポートを生成しました。`, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('エラー', '全週レポート生成中にエラーが発生しました: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 日付の妥当性チェック
 */
function isValidDate(dateValue) {
  if (!dateValue) return false;
  
  try {
    const date = new Date(dateValue);
    return !isNaN(date.getTime()) && date.getTime() > 0;
  } catch (e) {
    return false;
  }
}

/**
 * 週の開始日（土曜日）を取得（新ルール）
 */
function getWeekStartFromAnyDate(date) {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay(); // 0:Sun ... 6:Sat
  
  // 土曜日を週の開始とするため、土曜日からの経過日数を計算
  const daysFromSaturday = (dayOfWeek + 1) % 7;
  
  // 週の開始日（土曜日）を計算
  const weekStart = new Date(targetDate);
  weekStart.setDate(targetDate.getDate() - daysFromSaturday);
  
  return weekStart;
}

/**
 * 多数決により、週の所属月を算出する（新ルール）
 */
function getAssignedMonthByMajority(weekStart) {
  const monthCounts = {};
  
  // 7日間の各日が属する月をカウント
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
  }
  
  // 最多月を決定
  let maxMonth = '';
  let maxCount = 0;
  for (const [monthKey, count] of Object.entries(monthCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxMonth = monthKey;
    }
  }
  
  const [assignedYear, assignedMonth] = maxMonth.split('-').map(Number);
  return { year: assignedYear, month: assignedMonth };
}

/**
 * 指定月に「多数決で属する」週の一覧から、指定週の月内番号を取得（新ルール）
 */
function getWeekNumberInAssignedMonth(year, month, weekStart) {
  // その月の1日を含む週の土曜日を基準に計算
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysToFirstSaturday = (firstDayOfWeek + 1) % 7;
  
  const firstWeekStart = new Date(firstDayOfMonth);
  firstWeekStart.setDate(firstDayOfMonth.getDate() - daysToFirstSaturday);
  
  // 指定週がその月の何週目かを計算
  const diffInDays = Math.floor((weekStart.getTime() - firstWeekStart.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffInDays / 7) + 1;
  
  return Math.max(1, Math.min(weekNumber, 5)); // 1-5週の範囲
}

/**
 * 週の7日間が各月に何日ずつ属するかを計算（デバッグ用）
 */
function getMonthDayCounts(weekStart) {
  const monthCounts = {};
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
  }
  
  return monthCounts;
}

/**
 * 週セレクタから実際の週情報を取得（新ルール対応）
 */
function getWeekInfoFromSelector(weekSelector) {
  const match = weekSelector.match(/(\d+)月(\d+)W/);
  if (!match) return { actualMonth: 0, actualWeek: 0 };
  
  const month = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  const ctx = (typeof globalThis !== 'undefined' && globalThis.__WEEK_CTX__) || {};
  const year = ctx.year || new Date().getFullYear();
  
  // 週の開始日を計算
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeek = firstDayOfMonth.getUTCDay();
  const daysToSubtract = (firstDayOfWeek + 1) % 7;
  const firstWeekStartDate = new Date(firstDayOfMonth);
  firstWeekStartDate.setUTCDate(1 - daysToSubtract);
  
  const targetWeekStartDate = new Date(firstWeekStartDate);
  targetWeekStartDate.setUTCDate(firstWeekStartDate.getUTCDate() + (week - 1) * 7);
  
  // 多数決で実際に属する月を決定
  const actualAssignedMonth = getAssignedMonthByMajority(targetWeekStartDate);
  
  return {
    requestedMonth: month,
    requestedWeek: week,
    actualMonth: actualAssignedMonth.month,
    actualWeek: week
  };
}
