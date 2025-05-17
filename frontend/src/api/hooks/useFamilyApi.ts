import { useState, useCallback } from 'react';

import apiClient from '../client';

export interface Family {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

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

export interface FamilyCreate {
  name: string;
}

export interface FamilyMemberCreate {
  user_email: string;
  role: string;
  is_admin: boolean;
}

export const useFamilyApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 家族一覧を取得
  const getFamilies = useCallback(async (): Promise<Family[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/families');
      return response.data.data;
    } catch (err: any) {
      console.error('家族一覧取得エラー:', err);
      const message = err.response?.data?.detail || '家族一覧の取得に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 家族情報を取得
  const getFamily = useCallback(async (familyId: string): Promise<Family | null> => {
    if (!familyId) {
      setError('家族IDが指定されていません');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/families/${familyId}`);
      return response.data.data;
    } catch (err: any) {
      console.error('家族取得エラー:', err);
      const message = err.response?.data?.detail || '家族情報の取得に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 家族メンバー一覧を取得
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
    } catch (err: any) {
      console.error('家族メンバー取得エラー:', err);
      const message = err.response?.data?.detail || '家族メンバーの取得に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 新規家族作成
  const createFamily = useCallback(async (familyData: FamilyCreate): Promise<Family | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/families', familyData);
      return response.data.data;
    } catch (err: any) {
      console.error('家族作成エラー:', err);
      const message = err.response?.data?.detail || '家族の作成に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 家族メンバー追加
  const addFamilyMember = useCallback(async (familyId: string, memberData: FamilyMemberCreate): Promise<FamilyMember | null> => {
    if (!familyId) {
      setError('家族IDが指定されていません');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // バックエンドのスキーマに合わせて、family_idを追加する
      const dataWithFamilyId = {
        ...memberData,
        family_id: familyId
      };

      const response = await apiClient.post(`/families/${familyId}/members`, dataWithFamilyId);
      return response.data.data;
    } catch (err: any) {
      console.error('家族メンバー追加エラー:', err);
      const message = err.response?.data?.detail || '家族メンバーの追加に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 家族メンバー削除
  const removeFamilyMember = useCallback(async (familyId: string, userId: string): Promise<boolean> => {
    if (!familyId || !userId) {
      setError('必要なIDが指定されていません');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.delete(`/families/${familyId}/members/${userId}`);
      return true;
    } catch (err: any) {
      console.error('家族メンバー削除エラー:', err);
      const message = err.response?.data?.detail || '家族メンバーの削除に失敗しました';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getFamilies,
    getFamily,
    getFamilyMembers,
    createFamily,
    addFamilyMember,
    removeFamilyMember,
    loading,
    error,
  };
};
