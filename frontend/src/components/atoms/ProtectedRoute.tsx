import { CircularProgress } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * 認証が必要なルートを保護するコンポーネント
 * 認証されていない場合はログインページにリダイレクト
 */
const ProtectedRoute = () => {
  const location = useLocation();
  const { isAuthenticated, loading, currentFamily } = useAuth();

  // ローディング中の表示
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  // 認証されていなければログインページへ
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 家族が選択されていない場合、かつ現在のパスが/familyでない場合のみ家族管理ページへ
  if (!currentFamily?.id && location.pathname !== '/family') {
    return <Navigate to="/family" state={{ from: location }} replace />;
  }

  // 認証済みなら子ルートを表示
  return <Outlet />;
};

export default ProtectedRoute;
