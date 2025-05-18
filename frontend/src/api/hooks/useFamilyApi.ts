import { useState, useCallback } from 'react';

import { AxiosError } from 'axios';

import apiClient from '../client';

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

export const useFamilyApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return {
    getFamilyMembers,
    loading,
    error,
  };
};
