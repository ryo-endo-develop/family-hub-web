import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../api/client';
import { useAppSelector } from './reduxHooks';

/**
 * 認証状態に基づいてリダイレクトを行うカスタムフック
 * @param redirectToPathWhenAuthenticated 認証済みの場合のリダイレクト先
 * @param redirectToPathWhenNotAuthenticated 未認証の場合のリダイレクト先
 */
export const useAuthRedirect = (
  redirectToPathWhenAuthenticated?: string,
  redirectToPathWhenNotAuthenticated?: string
) => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // ロード中は何もしない
    if (loading) return;

    const hasToken = !!getAccessToken();
    
    // 既に認証済み状態なら認証済みページにリダイレクト
    if ((isAuthenticated || hasToken) && redirectToPathWhenAuthenticated) {
      navigate(redirectToPathWhenAuthenticated, { replace: true });
      return;
    }
    
    // 認証されていない状態なら未認証ページにリダイレクト
    if (!isAuthenticated && !hasToken && redirectToPathWhenNotAuthenticated) {
      navigate(redirectToPathWhenNotAuthenticated, { replace: true });
      return;
    }
  }, [isAuthenticated, loading, navigate, redirectToPathWhenAuthenticated, redirectToPathWhenNotAuthenticated]);

  return { isAuthenticated, loading };
};
