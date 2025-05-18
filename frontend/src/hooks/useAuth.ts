import { useEffect, useRef } from 'react';

import { useSelector } from 'react-redux';

import { RootState } from '../app/store';
import { checkAuth } from '../features/auth/authSlice';

import { useAppDispatch } from './reduxHooks';

/**
 * 認証状態を管理するフック
 * アプリ起動時に自動的に認証状態をチェック
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, loading, error, currentFamily } = useSelector(
    (state: RootState) => state.auth,
  );

  // 初期化済みかどうかのフラグ
  const initialized = useRef(false);

  // マウント時に一度だけ実行する初期化処理
  useEffect(() => {
    // 既に初期化済みなら何もしない
    if (initialized.current) {
      return;
    }

    // 初期化処理を実行
    const initialize = async () => {
      initialized.current = true;
      try {
        // 認証状態を確認
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await dispatch(checkAuth() as any);
      } catch (error) {
        console.error('認証状態の確認に失敗しました:', error);
      }
    };

    initialize();
  }, [dispatch]);

  return {
    isAuthenticated,
    user,
    loading,
    error,
    currentFamily,
  };
};
