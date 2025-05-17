import { useState, useCallback } from 'react';
import apiClient from '../client';
import { Tag } from '../../features/tasks/types';

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
    } catch (err: any) {
      console.error('タグ取得エラー:', err);
      const message = err.response?.data?.detail || 'タグの取得に失敗しました';
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
