import { CssBaseline, ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ja from 'date-fns/locale/ja';
import { useEffect } from 'react';

import AppRoutes from './app/router';
import { theme } from './styles/theme';
import { useDispatch } from 'react-redux';
import { checkAuth, logout } from './features/auth/authSlice';
import { registerLogoutHandler, setGlobalNotificationHandler } from './api/client';
import { NotificationProvider } from './contexts/NotificationContext';
import NotificationContainer from './components/NotificationContainer';
import { useNotification } from './contexts/NotificationContext';

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
  const dispatch = useDispatch();
  
  // アプリ起動時に認証状態をチェック
  useEffect(() => {
    console.log('アプリ起動時に認証状態をチェック');
    dispatch(checkAuth());
  }, [dispatch]);
  
  // APIクライアントにログアウトハンドラーを登録
  useEffect(() => {
    // 認証エラー時のログアウト処理
    const handleLogout = () => {
      console.log('自動ログアウトを実行');
      dispatch(logout());
      
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
