import { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { checkAuth } from '../features/auth/authSlice';
import { RootState } from '../app/store';

/**
 * 認証状態を管理するフック
 * アプリ起動時に自動的に認証状態をチェック
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading, error, currentFamily } = useSelector(
    (state: RootState) => state.auth,
  );

  // 初期化済みかどうか管理するステートを作成
  const [initialized, setInitialized] = useState(false);

  // 認証状態を確認する関数
  const checkAuthStatus = useCallback(async () => {
    try {
      await dispatch(checkAuth()).unwrap();
    } catch (error) {
      console.error('認証状態の確認に失敗しました:', error);
    } finally {
      setInitialized(true);
    }
  }, [dispatch]);

  // マウント時に一度だけ実行する初期化処理
  useEffect(() => {
    // まだ初期化されていない場合のみ実行
    if (!initialized) {
      checkAuthStatus();
    }
  }, [initialized, checkAuthStatus]);

  return {
    isAuthenticated,
    user,
    loading,
    error,
    currentFamily,
    initialized,
    checkAuthStatus,
  };
};
