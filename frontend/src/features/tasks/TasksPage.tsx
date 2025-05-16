import { Box, Button, CircularProgress, Container, Typography, Alert } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useCallback, useEffect, useState, useRef } from 'react';

import { useAppSelector } from '../../hooks/reduxHooks';
import { useTaskApi } from '../../api/hooks/useTaskApi';
import { Task, TaskFilter } from './types';
import TaskList from './components/TaskList';
import TaskFilterPanel from './components/TaskFilterPanel';
import TaskFormDialog from './components/TaskFormDialog';

const TasksPage = () => {
  const { currentFamily } = useAppSelector(state => state.auth);
  const { getTasks, loading: apiLoading, error: apiError } = useTaskApi();

  // フラグと状態の管理
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // フィルターを依存配列に含めないようにrefで管理
  const filtersRef = useRef<TaskFilter>({
    skip: 0,
    limit: 10,
  });

  // 表示用のフィルター状態
  const [displayFilters, setDisplayFilters] = useState<TaskFilter>(filtersRef.current);

  // データ取得中かどうかを追跡するフラグ
  const isFetchingRef = useRef(false);

  // タスク一覧を取得する関数（依存配列を最小限に）
  const fetchTasks = useCallback(async () => {
    if (!currentFamily.id) {
      setError('家族情報が取得できません');
      return;
    }

    // すでに取得中なら実行しない
    if (isFetchingRef.current) {
      console.log('データ取得中のため、リクエストをスキップします');
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      console.log('タスク一覧取得開始:', filtersRef.current);

      const response = await getTasks(currentFamily.id, filtersRef.current);

      if (response) {
        setTasks(response.tasks || []);
        setTotalTasks(response.total || 0);
      } else if (apiError) {
        setError(apiError);
      }
    } catch (err) {
      console.error('タスク取得エラー:', err);
      setError('タスクの取得に失敗しました');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [currentFamily.id, getTasks]);

  // 家族IDが変わった時だけタスク一覧を取得
  useEffect(() => {
    if (currentFamily.id) {
      fetchTasks();
    }
  }, [currentFamily.id, fetchTasks]);

  // タスク作成ダイアログを開く
  const handleOpenCreateDialog = () => {
    setSelectedTask(null);
    setIsFormOpen(true);
  };

  // タスク編集ダイアログを開く
  const handleOpenEditDialog = (task: Task) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  // タスク削除ハンドラ
  const handleDeleteTask = async (taskId: string) => {
    // 削除後、データを再取得する処理は子コンポーネントで実装
    const success = await useTaskApi().deleteTask(taskId);
    if (success) {
      fetchTasks();
    }
  };

  // タスク作成/編集完了ハンドラ
  const handleTaskFormClose = (refreshNeeded: boolean) => {
    setIsFormOpen(false);
    if (refreshNeeded) {
      fetchTasks();
    }
  };

  // フィルター変更ハンドラ
  const handleFilterChange = useCallback(
    (newFilters: Partial<TaskFilter>) => {
      // ref内のフィルターを更新
      filtersRef.current = {
        ...filtersRef.current,
        ...newFilters,
        skip: 0, // フィルター変更時は最初のページに戻る
      };

      // 表示用のフィルターも更新
      setDisplayFilters(filtersRef.current);

      // フィルター変更後にデータを再取得
      fetchTasks();
    },
    [fetchTasks],
  );

  // ページネーション変更ハンドラ
  const handlePageChange = useCallback(
    (page: number) => {
      // ref内のフィルターを更新
      filtersRef.current = {
        ...filtersRef.current,
        skip: page * filtersRef.current.limit,
      };

      // 表示用のフィルターも更新
      setDisplayFilters(filtersRef.current);

      // ページ変更後にデータを再取得
      fetchTasks();
    },
    [fetchTasks],
  );

  // 1ページあたりの行数変更ハンドラ
  const handleRowsPerPageChange = useCallback(
    (rowsPerPage: number) => {
      // ref内のフィルターを更新
      filtersRef.current = {
        ...filtersRef.current,
        limit: rowsPerPage,
        skip: 0, // 行数変更時は最初のページに戻る
      };

      // 表示用のフィルターも更新
      setDisplayFilters(filtersRef.current);

      // 行数変更後にデータを再取得
      fetchTasks();
    },
    [fetchTasks],
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1">
              タスク一覧
            </Typography>
            {currentFamily.name && (
              <Typography variant="subtitle1" color="text.secondary">
                {currentFamily.name}
              </Typography>
            )}
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            disabled={!currentFamily.id || loading}
          >
            新規タスク
          </Button>
        </Box>

        {!currentFamily.id && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            家族情報が取得できていません。所属する家族がない場合は、まず家族を作成してください。
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TaskFilterPanel
          filters={displayFilters}
          onFilterChange={handleFilterChange}
          disabled={loading}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TaskList
          tasks={tasks}
          onEdit={handleOpenEditDialog}
          onDelete={handleDeleteTask}
          total={totalTasks}
          page={Math.floor(filtersRef.current.skip / filtersRef.current.limit)}
          rowsPerPage={filtersRef.current.limit}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      )}

      {isFormOpen && currentFamily.id && (
        <TaskFormDialog
          open={isFormOpen}
          task={selectedTask}
          onClose={handleTaskFormClose}
          familyId={currentFamily.id}
        />
      )}
    </Container>
  );
};

export default TasksPage;
