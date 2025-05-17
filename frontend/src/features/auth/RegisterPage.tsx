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
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';

import { RegisterData, clearError, register as registerUser } from './authSlice';

// バリデーションスキーマ
const registerSchema = z
  .object({
    first_name: z.string().min(1, '名を入力してください'),
    last_name: z.string().min(1, '姓を入力してください'),
    email: z.string().email('有効なメールアドレスを入力してください'),
    password: z
      .string()
      .min(6, 'パスワードは6文字以上で入力してください')
      .refine((val) => /[0-9]/.test(val), {
        message: 'パスワードには数字を1文字以上含めてください',
      })
      .refine((val) => /[a-zA-Z]/.test(val), {
        message: 'パスワードにはアルファベットを1文字以上含めてください',
      }),
    confirm_password: z.string().min(1, 'パスワード（確認）を入力してください'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'パスワードが一致しません',
    path: ['confirm_password'],
  });

type RegisterFormInputs = z.infer<typeof registerSchema>;

const RegisterPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, error } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirm_password: '',
    },
  });

  // 認証済みならダッシュボードにリダイレクト
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // エラー表示をクリア
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // フォーム送信
  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    const userData: RegisterData = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      password: data.password,
    };
    
    try {
      await dispatch(registerUser(userData)).unwrap();
      // 登録成功後はログインページに遷移
      navigate('/login', { 
        state: { 
          registered: true,
          email: data.email
        } 
      });
    } catch (err) {
      console.error('ユーザー登録エラー:', err);
      // エラーはすでにReduxにセットされているので、ここでは何もしない
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
              新規登録
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="last_name"
                    label="姓"
                    autoComplete="family-name"
                    {...register('last_name')}
                    error={!!errors.last_name}
                    helperText={errors.last_name?.message}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="first_name"
                    label="名"
                    autoComplete="given-name"
                    {...register('first_name')}
                    error={!!errors.first_name}
                    helperText={errors.first_name?.message}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    label="メールアドレス"
                    autoComplete="email"
                    {...register('email')}
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                </Grid>
                <Grid item xs={12}>
                <TextField
                required
                fullWidth
                id="password"
                label="パスワード"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message || 'パスワードは6文字以上で、数字と1文字以上のアルファベットを含む必要があります'}
                />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="confirm_password"
                    label="パスワード（確認）"
                    type="password"
                    {...register('confirm_password')}
                    error={!!errors.confirm_password}
                    helperText={errors.confirm_password?.message}
                  />
                </Grid>
              </Grid>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : '登録する'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Grid container justifyContent="center">
          <Grid item>
            <Typography variant="body2">
              既にアカウントをお持ちの場合は
              <Link to="/login" style={{ textDecoration: 'none', color: 'primary.main' }}>
                ログイン
              </Link>
              へ
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default RegisterPage;
