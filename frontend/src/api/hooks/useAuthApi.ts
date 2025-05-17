import { useState } from 'react';

import { LoginCredentials, RegisterData, User } from '../../features/auth/authSlice';
import apiClient from '../client';

export const useAuthApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ログイン
  const login = async (
    credentials: LoginCredentials,
  ): Promise<{ token: string; user: User } | null> => {
    setLoading(true);
    setError(null);
    try {
      // FastAPIのOAuth2認証は形式が異なるため、フォームデータに変換
      const formData = new URLSearchParams();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      const response = await apiClient.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data.data;

      // ユーザー情報を取得
      const userResponse = await apiClient.get('/users/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      return {
        token: access_token,
        user: userResponse.data.data,
      };
    } catch (err: any) {
      const message = err.response?.data?.detail || 'ログインに失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ユーザー登録
  const register = async (userData: RegisterData): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data.data;
    } catch (err: any) {
      const message = err.response?.data?.detail || '登録に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 現在のユーザー情報を取得
  const getCurrentUser = async (): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/users/me');
      return response.data.data;
    } catch (err: any) {
      const message = err.response?.data?.detail || 'ユーザー情報の取得に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    register,
    getCurrentUser,
    loading,
    error,
  };
};
