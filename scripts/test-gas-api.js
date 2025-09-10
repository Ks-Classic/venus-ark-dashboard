/**
 * GAS API テストスクリプト
 * 新しいGAS Web App APIの動作確認
 */

// 環境変数を読み込む
require('dotenv').config({ path: '.env.local' });

const GAS_WEB_APP_URL = process.env.GAS_WEB_APP_URL || 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

/**
 * GAS API テスト実行
 */
async function testGASAPI() {
  console.log('🔍 環境変数確認:');
  console.log(`  GAS_WEB_APP_URL: ${process.env.GAS_WEB_APP_URL}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
  
  console.log('\n🧪 GAS API テスト開始');
  console.log(`📡 GAS Web App URL: ${GAS_WEB_APP_URL}`);
  console.log(`⏰ テスト時刻: ${new Date().toISOString()}`);
  
  // キャッシュバスティング用のタイムスタンプ
  const timestamp = Date.now();
  
  // テスト1: GET リクエスト（キャッシュバスティング付き）
  console.log('\n📤 テスト1: GET リクエスト（キャッシュバスティング付き）');
  const getParams = {
    weekSelector: '8月2W',
    platform: 'all',
    jobCategory: 'all',
    _t: timestamp // キャッシュバスティング用パラメータ
  };
  
  const getUrl = `${GAS_WEB_APP_URL}?${new URLSearchParams(getParams)}`;
  console.log(`🔗 リクエストURL: ${getUrl}`);
  console.log(`📋 リクエストパラメータ:`, getParams);
  
  try {
    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    console.log(`📊 レスポンスステータス: ${getResponse.status}`);
    console.log(`📋 レスポンスヘッダー:`, Object.fromEntries(getResponse.headers.entries()));
    
    const getResponseText = await getResponse.text();
    console.log(`📋 生レスポンス本文: ${getResponseText}`);
    
    try {
      const getData = JSON.parse(getResponseText);
      console.log(`✅ JSON解析成功:`, getData);
      
      if (getData.success) {
        console.log('🎉 GAS API 成功!');
        if (getData.data && getData.data.metrics) {
          console.log('📊 取得された指標:', getData.data.metrics);
        } else {
          console.log('📊 取得された指標: なし');
        }
      } else {
        console.log(`⚠️ GAS API 失敗: ${getData.error}`);
        if (getData.debug) {
          console.log(`🐛 デバッグ情報:`, getData.debug);
        }
      }
    } catch (parseError) {
      console.log(`❌ JSON解析エラー: ${parseError.message}`);
    }
    
  } catch (error) {
    console.log(`❌ テスト実行エラー: ${error.message}`);
    console.log(`📋 エラーの詳細:`, error);
  }
  
  // テスト2: POST リクエスト（キャッシュバスティング付き）
  console.log('\n📤 テスト2: POST リクエスト（キャッシュバスティング付き）');
  const postData = {
    weekSelector: '8月2W',
    platform: 'all',
    jobCategory: 'all',
    _t: timestamp // キャッシュバスティング用パラメータ
  };
  
  console.log(`📋 POSTデータ:`, postData);
  
  try {
    const postResponse = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify(postData)
    });
    
    console.log(`📊 POST レスポンスステータス: ${postResponse.status}`);
    const postResponseText = await postResponse.text();
    console.log(`📋 POST レスポンス本文: ${postResponseText}`);
    
    try {
      const postData = JSON.parse(postResponseText);
      console.log(`✅ POST JSON解析成功:`, postData);
    } catch (parseError) {
      console.log(`❌ POST JSON解析エラー: ${parseError.message}`);
    }
    
  } catch (error) {
    console.log(`❌ POST HTTP エラー: ${error.message}`);
  }
  
  console.log('\n🏁 テスト完了');
}

// テスト実行
testGASAPI().catch(console.error);
