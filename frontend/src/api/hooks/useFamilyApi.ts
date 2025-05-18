import { useState, useCallback } from 'react';

import { AxiosError } from 'axios';

import apiClient from '../client';

// 家族の型定義
export interface Family {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// 家族メンバーの型定義
export interface FamilyMember {
  id: string;
  user_id: string;
  family_id: string;
  role: string;
  is_admin: boolean;
  joined_at: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

// API エラーレスポンスの型定義
interface ApiErrorResponse {
  detail?: string;
  message?: string;
}

// 家族メンバー追加用のパラメータ
interface FamilyMemberParams {
  user_email: string;
  role: string;
  is_admin: boolean;
}

// 家族作成用のパラメータ
interface FamilyCreateParams {
  name: string;
}

export const useFamilyApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFamilies = useCallback(async (): Promise<Family[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/families');
      return response.data.data;
    } catch (err) {
      console.error('家族一覧取得エラー:', err);
      const axiosError = err as AxiosError<ApiErrorResponse>;
      const message = axiosError.response?.data?.detail || '家族一覧の取得に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFamilyMembers = useCallback(async (familyId: string): Promise<FamilyMember[] | null> => {
    if (!familyId) {
      setError('家族IDが指定されていません');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/families/${familyId}/members`);
      return response.data.data;
    } catch (err) {
      console.error('家族メンバー取得エラー:', err);
      const axiosError = err as AxiosError<ApiErrorResponse>;
      const message = axiosError.response?.data?.detail || '家族メンバーの取得に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createFamily = useCallback(async (params: FamilyCreateParams): Promise<Family | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/families', params);
      return response.data.data;
    } catch (err) {
      console.error('家族作成エラー:', err);
      const axiosError = err as AxiosError<ApiErrorResponse>;
      const message = axiosError.response?.data?.detail || '家族の作成に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const addFamilyMember = useCallback(async (familyId: string, params: FamilyMemberParams): Promise<FamilyMember | null> => {
    if (!familyId) {
      setError('家族IDが指定されていません');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post(`/families/${familyId}/members`, params);
      return response.data.data;
    } catch (err) {
      console.error('家族メンバー追加エラー:', err);
      const axiosError = err as AxiosError<ApiErrorResponse>;
      const message = axiosError.response?.data?.detail || 'メンバーの追加に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeFamilyMember = useCallback(async (familyId: string, userId: string): Promise<boolean> => {
    if (!familyId || !userId) {
      setError('家族IDまたはユーザーIDが指定されていません');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.delete(`/families/${familyId}/members/${userId}`);
      return true;
    } catch (err) {
      console.error('家族メンバー削除エラー:', err);
      const axiosError = err as AxiosError<ApiErrorResponse>;
      const message = axiosError.response?.data?.detail || 'メンバーの削除に失敗しました';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getFamilies,
    getFamilyMembers,
    createFamily,
    addFamilyMember,
    removeFamilyMember,
    loading,
    error,
  };
};
