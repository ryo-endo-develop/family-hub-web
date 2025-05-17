import { Suspense, lazy } from 'react';

import { CircularProgress } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from '../components/atoms/ProtectedRoute';
import MainLayout from '../layouts/MainLayout';

// ページのLazy Loading
const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/RegisterPage'));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
const TasksPage = lazy(() => import('../features/tasks/TasksPage'));
const FamilyPage = lazy(() => import('../features/family/FamilyPage'));
const NotFoundPage = lazy(() => import('../components/templates/NotFoundPage'));

// ローディングフォールバック
const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <CircularProgress />
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* 認証関連ルート */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 認証が必要なルート */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/family" element={<FamilyPage />} />
            {/* 他の認証が必要なルートをここに追加 */}
          </Route>
        </Route>

        {/* 404ページ */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
