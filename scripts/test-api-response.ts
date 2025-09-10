import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

async function testApiResponse() {
  try {
    console.log('=== APIレスポンステスト ===');
    
    const url = 'http://localhost:3001/api/work-status/weekly-detail?year=2025&month=6&week=3';
    console.log(`リクエストURL: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('\n=== APIレスポンス ===');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.weekDetails) {
      console.log('\n=== 週別詳細 ===');
      data.weekDetails.forEach((week: any, index: number) => {
        console.log(`\n[${index + 1}] ${week.weekLabel}`);
        console.log(`  総稼働者数: ${week.totalWorkers}`);
        console.log(`  新規開始人数: ${week.newStarted}`);
        console.log(`  切替完了人数: ${week.switching}`);
        console.log(`  案件終了人数: ${week.projectEnded}`);
        console.log(`  契約終了人数: ${week.contractEnded}`);
        console.log(`  総開始人数: ${week.totalStarted}`);
        console.log(`  総終了人数: ${week.totalEnded}`);
        
        if (week.startedMembers && week.startedMembers.length > 0) {
          console.log(`  開始メンバー:`);
          week.startedMembers.forEach((member: any) => {
            console.log(`    - ${member.memberName} (${member.type})`);
          });
        }
        
        if (week.endedMembers && week.endedMembers.length > 0) {
          console.log(`  終了メンバー:`);
          week.endedMembers.forEach((member: any) => {
            console.log(`    - ${member.memberName} (${member.type}: ${member.reason})`);
          });
        }
      });
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

testApiResponse(); 

// APIレスポンスの構造を確認するスクリプト

async function testAPIResponse() {
  console.log('=== APIレスポンス構造確認 ===');
  
  // 6月3週に対応するISO週番号24のデータを取得
  const url = 'http://localhost:3002/api/recruitment/optimized-weekly-summaries?jobCategory=SNS%E9%81%8B%E7%94%A8&mediaSources=indeed%2Cengage&year=2025&weekNumber=24&limit=1';
  
  try {
    console.log(`\n📡 API呼び出し: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('\n✅ レスポンス受信成功');
    console.log('📊 データ構造:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success && data.data && data.data.length > 0) {
      const summary = data.data[0];
      console.log('\n=== メトリクス詳細 ===');
      console.log(`応募数: ${summary.metrics?.applications || 'undefined'}`);
      console.log(`不採用数: ${summary.metrics?.rejected || 'undefined'}`);
      console.log(`継続中: ${summary.metrics?.continuing || 'undefined'}`);
      console.log(`書類提出数: ${summary.metrics?.documents || 'undefined'}`);
      console.log(`面接数: ${summary.metrics?.interviews || 'undefined'}`);
      console.log(`採用数: ${summary.metrics?.hired || 'undefined'}`);
      
      console.log('\n=== 不採用理由内訳 ===');
      if (summary.metrics?.rejectionReasons) {
        console.log(`経験者: ${summary.metrics.rejectionReasons.experienced || 0}`);
        console.log(`高齢: ${summary.metrics.rejectionReasons.elderly || 0}`);
        console.log(`不適合: ${summary.metrics.rejectionReasons.unsuitable || 0}`);
        console.log(`外国人: ${summary.metrics.rejectionReasons.foreign || 0}`);
        console.log(`その他: ${summary.metrics.rejectionReasons.other || 0}`);
      }
    } else {
      console.log('❌ データが見つかりません');
    }
    
  } catch (error) {
    console.error('❌ APIエラー:', error);
  }
}

// より多くのデータがある動画クリエイターでもテスト
async function testVideoCreatorData() {
  console.log('\n=== 動画クリエイターデータ確認 ===');
  
  const url = 'http://localhost:3002/api/recruitment/optimized-weekly-summaries?jobCategory=%E5%8B%95%E7%94%BB%E3%82%AF%E3%83%AA%E3%82%A8%E3%82%A4%E3%82%BF%E3%83%BC&mediaSources=indeed%2Cengage&year=2025&weekNumber=24&limit=1';
  
  try {
    console.log(`\n📡 API呼び出し: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success && data.data && data.data.length > 0) {
      const summary = data.data[0];
      console.log('\n=== 動画クリエイター メトリクス ===');
      console.log(`応募数: ${summary.metrics?.applications || 'undefined'}`);
      console.log(`不採用数: ${summary.metrics?.rejected || 'undefined'}`);
      console.log(`継続中: ${summary.metrics?.continuing || 'undefined'}`);
      console.log(`書類提出数: ${summary.metrics?.documents || 'undefined'}`);
      console.log(`面接数: ${summary.metrics?.interviews || 'undefined'}`);
      console.log(`採用数: ${summary.metrics?.hired || 'undefined'}`);
      
      // 推測計算の確認
      const estimatedAppRejected = Math.max(0, summary.metrics.applications - summary.metrics.documents - summary.metrics.continuing);
      const estimatedDocRejected = Math.max(0, summary.metrics.rejected - estimatedAppRejected);
      
      console.log('\n=== UI計算結果 ===');
      console.log(`応募段階不採用数（推測）: ${estimatedAppRejected}`);
      console.log(`書類段階不採用数（推測）: ${estimatedDocRejected}`);
    }
    
  } catch (error) {
    console.error('❌ APIエラー:', error);
  }
}

// 実行
testAPIResponse().then(() => testVideoCreatorData()); 