import { useEffect } from 'react';

import { CssBaseline, ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ja from 'date-fns/locale/ja';

import { registerLogoutHandler, setGlobalNotificationHandler } from './api/client';
import AppRoutes from './app/router';
import NotificationContainer from './components/NotificationContainer';
import { NotificationProvider , useNotification } from './contexts/NotificationContext';
import { checkAuth, logout } from './features/auth/authSlice';
import { theme } from './styles/theme';
import { useAppDispatch } from './hooks/reduxHooks';

// グローバル通知ハンドラーを設定するためのコンポーネント
const NotificationHandler = () => {
  const { addNotification } = useNotification();

  useEffect(() => {
    // グローバル通知ハンドラーを設定
    setGlobalNotificationHandler((message, type, duration) => {
      addNotification({ message, type, duration });
    });
  }, [addNotification]);

  return null;
};

function App() {
  const dispatch = useAppDispatch();

  // アプリ起動時に認証状態をチェック
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch(checkAuth() as any);
  }, [dispatch]);

  // APIクライアントにログアウトハンドラーを登録
  useEffect(() => {
    // 認証エラー時のログアウト処理
    const handleLogout = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch(logout() as any);

      // ログイン画面に遷移
      window.location.href = '/login';
    };

    // ハンドラーを登録
    const unregister = registerLogoutHandler(handleLogout);

    // クリーンアップ
    return unregister;
  }, [dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
        <NotificationProvider>
          <NotificationHandler />
          <CssBaseline />
          <AppRoutes />
          <NotificationContainer />
        </NotificationProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
