import { toast } from "sonner";

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // APIエラーの処理
  handleApiError(error: any, context: string = 'API'): AppError {
    const appError: AppError = {
      code: this.getErrorCode(error),
      message: this.getErrorMessage(error),
      details: error,
      timestamp: new Date()
    };

    this.logError(appError);
    this.showUserFriendlyMessage(appError, context);
    
    return appError;
  }

  // データ処理エラーの処理
  handleDataError(error: any, context: string = 'データ処理'): AppError {
    const appError: AppError = {
      code: 'DATA_PROCESSING_ERROR',
      message: this.getErrorMessage(error),
      details: error,
      timestamp: new Date()
    };

    this.logError(appError);
    this.showUserFriendlyMessage(appError, context);
    
    return appError;
  }

  // バリデーションエラーの処理
  handleValidationError(error: any, context: string = 'バリデーション'): AppError {
    const appError: AppError = {
      code: 'VALIDATION_ERROR',
      message: this.getErrorMessage(error),
      details: error,
      timestamp: new Date()
    };

    this.logError(appError);
    this.showUserFriendlyMessage(appError, context);
    
    return appError;
  }

  // ネットワークエラーの処理
  handleNetworkError(error: any, context: string = 'ネットワーク'): AppError {
    const appError: AppError = {
      code: 'NETWORK_ERROR',
      message: this.getErrorMessage(error),
      details: error,
      timestamp: new Date()
    };

    this.logError(appError);
    this.showUserFriendlyMessage(appError, context);
    
    return appError;
  }

  // エラーログの記録
  private logError(error: AppError): void {
    this.errorLog.push(error);
    // ブラウザのコンソールで {} と表示されるのを避けるため、文字列で出力
    const summary = `Application Error [${error.code}] ${error.message} @ ${error.timestamp.toISOString()}`;
    console.error(summary);
  }

  // ユーザーフレンドリーなメッセージの表示
  private showUserFriendlyMessage(error: AppError, context: string): void {
    const userMessage = this.getUserFriendlyMessage(error.code, context);
    toast.error(userMessage);
  }

  // エラーコードの取得
  private getErrorCode(error: any): string {
    if (error?.status) {
      return `HTTP_${error.status}`;
    }
    if (error?.code) {
      return error.code;
    }
    return 'UNKNOWN_ERROR';
  }

  // エラーメッセージの取得
  private getErrorMessage(error: any): string {
    if (!error) return '不明なエラーが発生しました';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.error && typeof error.error === 'string') return error.error;
    if (error.details && typeof error.details === 'string') return error.details;
    try {
      const s = String(error);
      if (s && s !== '[object Object]') return s;
    } catch {}
    return '不明なエラーが発生しました';
  }

  // ユーザーフレンドリーなメッセージの取得
  private getUserFriendlyMessage(code: string, context: string): string {
    const messages: Record<string, string> = {
      'HTTP_400': `${context}のリクエストが不正です`,
      'HTTP_401': `${context}の認証に失敗しました`,
      'HTTP_403': `${context}へのアクセスが拒否されました`,
      'HTTP_404': `${context}のリソースが見つかりません`,
      'HTTP_500': `${context}でサーバーエラーが発生しました`,
      'HTTP_502': `${context}のサーバーが一時的に利用できません`,
      'HTTP_503': `${context}のサービスが一時的に利用できません`,
      'NETWORK_ERROR': `${context}の通信に失敗しました。インターネット接続を確認してください`,
      'DATA_PROCESSING_ERROR': `${context}の処理中にエラーが発生しました`,
      'VALIDATION_ERROR': `${context}の入力内容に問題があります`,
      'UNKNOWN_ERROR': `${context}で予期しないエラーが発生しました`
    };

    return messages[code] || `${context}でエラーが発生しました`;
  }

  // エラーログの取得
  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  // エラーログのクリア
  clearErrorLog(): void {
    this.errorLog = [];
  }

  // 特定の期間のエラーログを取得
  getErrorsByTimeRange(startTime: Date, endTime: Date): AppError[] {
    return this.errorLog.filter(error => 
      error.timestamp >= startTime && error.timestamp <= endTime
    );
  }

  // 特定のエラーコードのエラーを取得
  getErrorsByCode(code: string): AppError[] {
    return this.errorLog.filter(error => error.code === code);
  }
}

// エクスポート用の便利関数
export const errorHandler = ErrorHandler.getInstance();

// 非同期処理のエラーハンドリング用ラッパー
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string = '操作'
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    errorHandler.handleApiError(error, context);
    return null;
  }
}

// 同期処理のエラーハンドリング用ラッパー
export function withSyncErrorHandling<T>(
  operation: () => T,
  context: string = '操作'
): T | null {
  try {
    return operation();
  } catch (error) {
    errorHandler.handleApiError(error, context);
    return null;
  }
}
