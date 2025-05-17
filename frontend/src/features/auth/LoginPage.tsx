import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';

import { useAuth } from '../../hooks/useAuth';

import { LoginCredentials, clearError, login } from './authSlice';

// バリデーションスキーマ
const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAuthenticated, loading, error } = useAuth();
  
  // ロケーションステートから登録成功フラグとメールアドレスを取得
  const registeredState = location.state as { registered?: boolean; email?: string } | null;
  const isRegistered = registeredState?.registered || false;
  const registeredEmail = registeredState?.email || '';
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: registeredEmail || '',
      password: '',
    },
  });

  // エラー表示をクリア
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // 認証済みならダッシュボードへリダイレクト
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // フォーム送信
  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    const credentials: LoginCredentials = {
      email: data.email,
      password: data.password,
    };
    
    try {
      await dispatch(login(credentials));
    } catch (error) {
      console.error('ログイン処理中にエラー:', error);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography component="h1" variant="h4" fontWeight="bold" color="primary.main">
            SyncFam
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            家族向けハブアプリ
          </Typography>
        </Box>

        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography component="h2" variant="h5" align="center" gutterBottom>
              ログイン
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {isRegistered && (
              <Alert severity="success" sx={{ mb: 2 }}>
                アカウント登録が完了しました。ログインしてサービスをご利用ください。
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="メールアドレス"
                autoComplete="email"
                autoFocus
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="password"
                label="パスワード"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'ログイン'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Grid container justifyContent="center">
          <Grid item>
            <Typography variant="body2">
              アカウントをお持ちでない場合は
              <Link to="/register" style={{ textDecoration: 'none', color: 'primary.main' }}>
                新規登録
              </Link>
              へ
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default LoginPage;
