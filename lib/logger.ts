import pino from 'pino';

// シンプルな出力に統一（ESM/CJS混在によるランタイム不具合回避のため pretty を使用しない）
const stream = pino.destination(1);

const resolvedLevel = (process.env.RECRUITMENT_DEBUG === 'true' || process.env.VERBOSE === 'true')
  ? 'debug'
  : (process.env.LOG_LEVEL || 'info');

const logger = pino({
  level: resolvedLevel,
}, stream);

export default logger;

// 追加: 採用デバッグの有効/無効判定
export function isRecruitmentDebugEnabled(): boolean {
  return (
    process.env.RECRUITMENT_DEBUG === 'true' ||
    process.env.VERBOSE === 'true' ||
    (process.env.NODE_ENV !== 'production' && (process.env.LOG_LEVEL === 'debug' || process.env.LOG_LEVEL === 'trace'))
  );
}

export function isRecruitmentVerboseEnabled(): boolean {
  return process.env.RECRUITMENT_DEBUG_VERBOSE === 'true';
}

// 追加: simple file-like logger API のスタブ（過去コード互換）
export function appendToLog(message: string, meta?: Record<string, any>): void {
  const ts = new Date().toISOString();
  if (meta) {
    logger.info({ ts, ...meta }, message);
  } else {
    logger.info(`[${ts}] ${message}`);
  }
}

export function logPhase(traceId: string | undefined, phase: string, startMs: number, extra?: Record<string, any>): void {
  const durationMs = Date.now() - startMs;
  const ts = new Date().toISOString();
  logger.info({ ts, traceId, phase, durationMs, ...(extra || {}) }, '[TRACE] phase');
}