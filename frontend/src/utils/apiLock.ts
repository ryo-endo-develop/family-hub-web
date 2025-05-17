// apiLock.ts - APIリクエストをグローバルにロックする機構

// 指定された期間内に特定のAPIオペレーションが再度実行されるのを防ぐためのロック
interface LockEntry {
  timestamp: number;
  expiresAt: number;
}

// APIロックを格納するオブジェクト
const apiLocks: Record<string, LockEntry> = {};

// ロックが有効かどうかを確認
export const isLocked = (operationKey: string): boolean => {
  const lock = apiLocks[operationKey];
  if (!lock) return false;

  const now = Date.now();
  // 有効期限を過ぎていれば解除
  if (now > lock.expiresAt) {
    delete apiLocks[operationKey];
    return false;
  }

  return true;
};

// APIオペレーションをロック
export const lockOperation = (operationKey: string, durationMs: number = 5000): void => {
  const now = Date.now();
  apiLocks[operationKey] = {
    timestamp: now,
    expiresAt: now + durationMs,
  };
};

// ロックを解除
export const unlockOperation = (operationKey: string): void => {
  delete apiLocks[operationKey];
};

// オペレーションを実行するか、既にロックされている場合はスキップ
export const executeOnceOrSkip = async <T>(
  operationKey: string,
  operation: () => Promise<T>,
  lockDuration: number = 5000,
): Promise<T | null> => {
  if (isLocked(operationKey)) {
    return null;
  }

  try {
    lockOperation(operationKey, lockDuration);
    return await operation();
  } finally {
    // エラーが発生しても、一定時間後には再試行できるように
    // 即時ロック解除はせず、ロックの有効期限で自動解除を待つ
  }
};
