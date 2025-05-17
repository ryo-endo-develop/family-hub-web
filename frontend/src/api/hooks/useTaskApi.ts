import { useState, useCallback } from 'react';

import apiClient from '../client';
import {
  Task,
  TaskCreate,
  TaskFilter,
  TaskListResponse,
  TaskUpdate,
  SubtaskCreate,
} from '../../features/tasks/types';

/**
 * タスクAPI操作のためのフック
 * サブタスク対応に拡張
 */
export const useTaskApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * タスク一覧を取得（既存の関数）
   */
  const getTasks = useCallback(
    async (family_id: string, filters?: TaskFilter): Promise<TaskListResponse | null> => {
      if (!family_id) {
        setError('家族IDが指定されていません');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        // クエリパラメータを構築
        const params = new URLSearchParams();
        params.append('family_id', family_id);

        if (filters) {
          if (filters.assignee_id) params.append('assignee_id', filters.assignee_id);
          if (filters.status) params.append('status', filters.status);
          if (filters.is_routine !== undefined)
            params.append('is_routine', String(filters.is_routine));
          if (filters.due_before)
            params.append('due_before', filters.due_before.toISOString().split('T')[0]);
          if (filters.due_after)
            params.append('due_after', filters.due_after.toISOString().split('T')[0]);
          if (filters.tag_ids?.length) {
            filters.tag_ids.forEach(id => params.append('tag_ids', id));
          }
          if (filters.skip !== undefined) params.append('skip', String(filters.skip));
          if (filters.limit !== undefined) params.append('limit', String(filters.limit));
        }

        const response = await apiClient.get(`/tasks?${params.toString()}`);

        // APIレスポンスを処理
        if (response.data && response.data.data) {
          if (Array.isArray(response.data.data)) {
            // レスポンスが配列の場合
            return {
              tasks: response.data.data,
              total: response.data.total || response.data.data.length,
            };
          } else if (response.data.data.tasks) {
            // レスポンスがページネーション情報を含む場合
            return response.data.data;
          }
        }
        
        setError('APIレスポンスの形式が不正です');
        return null;
      } catch (err: any) {
        console.error('タスク取得エラー:', err);
        const message = err.response?.data?.detail || 'タスクの取得に失敗しました';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * ルートタスク（親を持たないタスク）を取得する
   * 各ルートタスクにはサブタスクも含まれる
   */
  const getRootTasks = useCallback(
    async (family_id: string, filters?: TaskFilter): Promise<TaskListResponse | null> => {
      if (!family_id) {
        setError('家族IDが指定されていません');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        // クエリパラメータを構築
        const params = new URLSearchParams();
        params.append('family_id', family_id);

        if (filters) {
          // 他のフィルターパラメータ
          if (filters.assignee_id) params.append('assignee_id', filters.assignee_id);
          if (filters.status) params.append('status', filters.status);
          if (filters.is_routine !== undefined)
            params.append('is_routine', String(filters.is_routine));
          if (filters.due_before)
            params.append('due_before', filters.due_before.toISOString().split('T')[0]);
          if (filters.due_after)
            params.append('due_after', filters.due_after.toISOString().split('T')[0]);
          if (filters.tag_ids?.length) {
            filters.tag_ids.forEach(id => params.append('tag_ids', id));
          }
          if (filters.skip !== undefined) params.append('skip', String(filters.skip));
          if (filters.limit !== undefined) params.append('limit', String(filters.limit));
        }

        const response = await apiClient.get(`/tasks/roots?${params.toString()}`);

        // APIレスポンスを処理
        if (response.data && response.data.data) {
          return {
            tasks: response.data.data,
            total: response.data.total || response.data.data.length,
          };
        }
        
        setError('APIレスポンスの形式が不正です');
        return null;
      } catch (err: any) {
        console.error('ルートタスク取得エラー:', err);
        const message = err.response?.data?.detail || 'タスクの取得に失敗しました';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * タスク詳細を取得（既存の関数）
   */
  const getTask = useCallback(async (task_id: string): Promise<Task | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/tasks/${task_id}`);
      return response.data.data;
    } catch (err: any) {
      console.error('タスク詳細取得エラー:', err);
      const message = err.response?.data?.detail || 'タスクの取得に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * サブタスクを含むタスク詳細を取得（新規）
   */
  const getTaskWithSubtasks = useCallback(async (task_id: string): Promise<Task | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/tasks/with-subtasks/${task_id}`);
      return response.data.data;
    } catch (err: any) {
      console.error('タスク詳細取得エラー:', err);
      const message = err.response?.data?.detail || 'タスクの取得に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * タスクを作成（既存の関数）
   */
  const createTask = useCallback(async (task: TaskCreate): Promise<Task | null> => {
    if (!task.family_id) {
      setError('家族IDが指定されていません');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // 日付フォーマットの調整
      const formattedTask = {
        ...task,
        due_date: task.due_date ? task.due_date.toISOString().split('T')[0] : null,
      };

      const response = await apiClient.post('/tasks', formattedTask);
      return response.data.data;
    } catch (err: any) {
      console.error('タスク作成エラー:', err);
      const message = err.response?.data?.detail || 'タスクの作成に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * サブタスクを作成（新規）
   */
  const createSubtask = useCallback(async (
    parent_id: string,
    subtask: SubtaskCreate
  ): Promise<Task | null> => {
    setLoading(true);
    setError(null);

    try {
      // 日付フォーマットの調整
      const formattedTask = {
        ...subtask,
        due_date: subtask.due_date ? subtask.due_date.toISOString().split('T')[0] : null,
      };

      const response = await apiClient.post(`/tasks/${parent_id}/subtasks`, formattedTask);
      return response.data.data;
    } catch (err: any) {
      console.error('サブタスク作成エラー:', err);
      const message = err.response?.data?.detail || 'サブタスクの作成に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * タスクを更新（既存の関数）
   */
  const updateTask = useCallback(async (task_id: string, task: TaskUpdate): Promise<Task | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log('updateTask called with:', task_id, task);
      console.log('due_date before formatting:', task.due_date, typeof task.due_date);
      
      // 日付データの有効性チェック
      let due_date = null;
      if (task.due_date) {
        if (task.due_date instanceof Date) {
          // toISOStringがタイムゾーン付きのUTC日付に変換するので、日付部分だけを取得
          due_date = task.due_date.toISOString().split('T')[0];
        } else if (typeof task.due_date === 'string') {
          // すでに文字列の場合はそのまま使用
          due_date = task.due_date;
        } else {
          console.error('Unknown date format:', task.due_date);
          due_date = null;
        }
      }
      
      // 日付フォーマットの調整
      const formattedTask = {
        ...task,
        due_date,
      };
      
      console.log('Sending formatted task:', formattedTask);

      const response = await apiClient.put(`/tasks/${task_id}`, formattedTask);
      return response.data.data;
    } catch (err: any) {
      console.error('タスク更新エラー:', err);
      // レスポンスの詳細をログ出力
      if (err.response) {
        console.error('Error response:', {
          status: err.response.status,
          headers: err.response.headers,
          data: err.response.data
        });
      }
      const message = err.response?.data?.detail || 'タスクの更新に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * タスクを削除（既存の関数）
   */
  const deleteTask = useCallback(async (task_id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.delete(`/tasks/${task_id}`);
      return true;
    } catch (err: any) {
      console.error('タスク削除エラー:', err);
      const message = err.response?.data?.detail || 'タスクの削除に失敗しました';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getTasks,
    getRootTasks,
    getTask,
    getTaskWithSubtasks,
    createTask,
    createSubtask,
    updateTask,
    deleteTask,
    loading,
    error,
  };
};
