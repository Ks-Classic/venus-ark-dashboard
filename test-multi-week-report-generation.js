// 複数週レポート生成テストスクリプト
const testMultiWeekReportGeneration = async () => {
  console.log('🚀 複数週レポート生成テスト開始');
  
  try {
    // W25-W28の複数週レポートを生成
    const response = await fetch('http://localhost:3000/api/recruitment/generate-reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        year: 2025,
        startWeekNumber: 25,
        endWeekNumber: 28,
        jobCategories: ['SNS運用', '動画クリエイター', 'AIライター', '撮影スタッフ']
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 複数週レポート生成成功:', result);
      console.log(`生成されたレポート数: ${result.reportsGenerated}`);
      console.log(`成功: ${result.successCount}, エラー: ${result.errorCount}`);
    } else {
      console.error('❌ 複数週レポート生成失敗:', result.error);
    }
    
  } catch (error) {
    console.error('❌ リクエストエラー:', error);
  }
};

// Node.js環境での実行
if (typeof window === 'undefined') {
  // Node.js環境（サーバーサイド）
  const fetch = require('node-fetch');
  testMultiWeekReportGeneration();
} else {
  // ブラウザ環境
  console.log('ブラウザのコンソールでこのスクリプトを実行してください');
}

// ブラウザ環境での実行用
window.testMultiWeekReportGeneration = testMultiWeekReportGeneration; 