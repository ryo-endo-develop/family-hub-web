import { useState, useCallback } from 'react';

import { AxiosError } from 'axios';

import { Tag } from '../../features/tasks/types';
import apiClient from '../client';

// API エラーレスポンスの型定義
interface ApiErrorResponse {
  detail?: string;
  message?: string;
}

export const useTagApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFamilyTags = useCallback(async (familyId: string): Promise<Tag[] | null> => {
    if (!familyId) {
      setError('家族IDが指定されていません');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/tags/family/${familyId}`);
      return response.data.data;
    } catch (err) {
      console.error('タグ取得エラー:', err);
      const axiosError = err as AxiosError<ApiErrorResponse>;
      const message = axiosError.response?.data?.detail || 'タグの取得に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getFamilyTags,
    loading,
    error,
  };
};
