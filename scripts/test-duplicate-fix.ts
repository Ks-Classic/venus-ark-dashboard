import { getAdminDb } from '../lib/firebase/admin';

async function testDuplicateFix() {
  console.log('[TEST] 重複除去ロジックのテスト開始');
  
  try {
    // APIを直接呼び出してテスト
    const response = await fetch('http://localhost:3000/api/work-status/future-projection?year=2025&month=7');
    const data = await response.json();
    
    if (data.success) {
      console.log('[TEST] APIレスポンス成功');
      
      data.data.forEach((projection: any, index: number) => {
        console.log(`\n[TEST] ${projection.year}年${projection.month}月:`);
        console.log(`  見込総数: ${projection.totalProjected}名`);
        console.log(`  新規開始: ${projection.newStarting.count}名`);
        console.log(`  切替完了: ${projection.switching.count}名`);
        console.log(`  案件終了: ${projection.projectEnding.count}名`);
        console.log(`  契約終了: ${projection.contractEnding.count}名`);
        
        // 重複チェック
        const allMembers = [
          ...projection.newStarting.members,
          ...projection.switching.members,
          ...projection.projectEnding.members,
          ...projection.contractEnding.members
        ];
        
        const memberIds = allMembers.map((m: any) => m.id);
        const uniqueIds = new Set(memberIds);
        
        if (memberIds.length !== uniqueIds.size) {
          console.log(`  ⚠️ 重複検出: 総メンバー数 ${memberIds.length}, ユニーク数 ${uniqueIds.size}`);
          
          // 重複メンバーを特定
          const seen = new Set();
          const duplicates = [];
          for (const id of memberIds) {
            if (seen.has(id)) {
              duplicates.push(id);
            } else {
              seen.add(id);
            }
          }
          console.log(`  重複メンバーID: ${duplicates.join(', ')}`);
        } else {
          console.log(`  ✅ 重複なし: ${uniqueIds.size}名のユニークメンバー`);
        }
      });
    } else {
      console.error('[TEST] APIエラー:', data.error);
    }
    
  } catch (error) {
    console.error('[TEST] テスト実行エラー:', error);
  }
}

// 直接実行
if (require.main === module) {
  testDuplicateFix();
}

export { testDuplicateFix }; 