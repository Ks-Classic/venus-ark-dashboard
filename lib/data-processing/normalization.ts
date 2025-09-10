/**
 * 氏名の正規化処理
 * 全角・半角スペースの除去、全角カタカナへの変換、アルファベットの統一を行う
 */

/**
 * 全角・半角スペースを除去する
 */
export function removeSpaces(text: string): string {
  return text.replace(/[\s　]/g, '');
}

/**
 * ひらがなを全角カタカナに変換する
 */
export function hiraganaToKatakana(text: string): string {
  return text.replace(/[\u3041-\u3096]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) + 0x60);
  });
}

/**
 * 半角カタカナを全角カタカナに変換する
 */
export function hankakuToZenkakuKatakana(text: string): string {
  const hankakuKatakana = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｧｨｩｪｫｬｭｮｯ';
  const zenkakuKatakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンァィゥェォャュョッ';
  
  let result = text;
  for (let i = 0; i < hankakuKatakana.length; i++) {
    const regex = new RegExp(hankakuKatakana[i], 'g');
    result = result.replace(regex, zenkakuKatakana[i]);
  }
  
  // 濁点・半濁点の処理
  result = result.replace(/ｶﾞ/g, 'ガ').replace(/ｷﾞ/g, 'ギ').replace(/ｸﾞ/g, 'グ')
    .replace(/ｹﾞ/g, 'ゲ').replace(/ｺﾞ/g, 'ゴ').replace(/ｻﾞ/g, 'ザ')
    .replace(/ｼﾞ/g, 'ジ').replace(/ｽﾞ/g, 'ズ').replace(/ｾﾞ/g, 'ゼ')
    .replace(/ｿﾞ/g, 'ゾ').replace(/ﾀﾞ/g, 'ダ').replace(/ﾁﾞ/g, 'ヂ')
    .replace(/ﾂﾞ/g, 'ヅ').replace(/ﾃﾞ/g, 'デ').replace(/ﾄﾞ/g, 'ド')
    .replace(/ﾊﾞ/g, 'バ').replace(/ﾋﾞ/g, 'ビ').replace(/ﾌﾞ/g, 'ブ')
    .replace(/ﾍﾞ/g, 'ベ').replace(/ﾎﾞ/g, 'ボ').replace(/ﾊﾟ/g, 'パ')
    .replace(/ﾋﾟ/g, 'ピ').replace(/ﾌﾟ/g, 'プ').replace(/ﾍﾟ/g, 'ペ')
    .replace(/ﾎﾟ/g, 'ポ').replace(/ｳﾞ/g, 'ヴ');
  
  return result;
}

/**
 * アルファベットを半角大文字に統一する
 */
export function normalizeAlphabet(text: string): string {
  // 全角アルファベットを半角に変換
  let result = text.replace(/[Ａ-Ｚａ-ｚ]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
  });
  
  // 半角アルファベットを大文字に変換
  result = result.toUpperCase();
  
  return result;
}

/**
 * 数字を半角に統一する
 */
export function normalizeNumbers(text: string): string {
  return text.replace(/[０-９]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
  });
}

/**
 * 氏名を正規化する（メイン関数）
 */
export function normalizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  let normalized = name.trim();
  
  // 括弧（ふりがな等）を除去
  normalized = normalized.replace(/[（(][^）)]*[）)]/g, '');

  // スペースを除去
  normalized = removeSpaces(normalized);
  
  // ひらがなを全角カタカナに変換
  normalized = hiraganaToKatakana(normalized);
  
  // 半角カタカナを全角カタカナに変換
  normalized = hankakuToZenkakuKatakana(normalized);
  
  // アルファベットを半角大文字に統一
  normalized = normalizeAlphabet(normalized);
  
  // 数字を半角に統一
  normalized = normalizeNumbers(normalized);
  
  return normalized;
}

/**
 * メールアドレスを正規化する
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  return email.trim().toLowerCase();
}

/**
 * 電話番号を正規化する（ハイフンを除去し、数字のみにする）
 */
export function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  
  // ハイフン、スペース、括弧を除去し、数字のみを抽出
  let normalized = phone.replace(/[-\s()（）]/g, '');
  
  // 全角数字を半角に変換
  normalized = normalizeNumbers(normalized);
  
  return normalized;
} 