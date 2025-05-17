import { useCallback, useEffect, useState, useRef } from 'react';

import { Add as AddIcon, ViewList as ViewListIcon, AccountTree as AccountTreeIcon } from '@mui/icons-material';
import { Box, Button, CircularProgress, Container, Typography, Alert, ToggleButtonGroup, ToggleButton, Paper, Fab, useMediaQuery, useTheme } from '@mui/material';

import { useTaskApi } from '../../api/hooks/useTaskApi';
import { useNotification } from '../../contexts/NotificationContext';
import { useAppSelector } from '../../hooks/reduxHooks';

import SubtaskFormDialog from './components/subtasks/SubtaskFormDialog';
import TaskListWithSubtasks from './components/subtasks/TaskListWithSubtasks';
import TaskFilterPanel from './components/TaskFilterPanel';
import TaskFormDialog from './components/TaskFormDialog';
import TaskList from './components/TaskList';
import { Task, TaskFilter } from './types';


// 表示モード
type ViewMode = 'flat' | 'tree';

const TasksPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { currentFamily } = useAppSelector(state => state.auth);
  const { getTasks, getRootTasks, deleteTask, loading: apiLoading, error: apiError } = useTaskApi();
  const { addNotification } = useNotification();

  // フラグと状態の管理
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubtaskFormOpen, setIsSubtaskFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  
  // 表示モード（フラットビュー or ツリービュー）
  // モバイルまたはタブレットの場合は常にフラットビュー
  const [viewMode, setViewMode] = useState<ViewMode>('flat');

  // 画面サイズが変わったときにモードを調整
  useEffect(() => {
    // 画面が小さい場合は常にフラットビューを使用
    if (isTablet && viewMode === 'tree') {
      setViewMode('flat');
    }
  }, [isTablet, viewMode]);
  
  // 初期表示では常にフラットビューを使用
  useEffect(() => {
    setViewMode('flat');
  }, []);

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

      let response;
      
      // 表示モードに応じてAPIを切り替え
      if (viewMode === 'tree') {
        // ツリービュー - ルートタスクのみ取得（サブタスクは階層的に表示）
        response = await getRootTasks(currentFamily.id, filtersRef.current);
      } else {
        // フラットビュー - 全タスクをフラットに表示
        response = await getTasks(currentFamily.id, filtersRef.current);
      }

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
  }, [currentFamily.id, getTasks, getRootTasks, viewMode, apiError]);

  // 家族IDが変わった時とビューモードが変わった時にタスク一覧を取得
  useEffect(() => {
    if (currentFamily.id) {
      fetchTasks();
    }
  }, [currentFamily.id, viewMode, fetchTasks]);

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

  // サブタスク作成ダイアログを開く
  const handleOpenSubtaskDialog = (parentTask: Task) => {
    setParentTask(parentTask);
    setIsSubtaskFormOpen(true);
  };

  // タスク削除ハンドラ
  const handleDeleteTask = async (taskId: string) => {
    try {
      // 削除するタスクを特定
      const taskToDelete = tasks.find(t => t.id === taskId);
      const taskTitle = taskToDelete?.title || 'タスク';
      
      // 削除APIを呼び出し
      const success = await deleteTask(taskId);
      
      if (success) {
        // 成功通知を表示
        addNotification({
          type: 'success',
          message: `タスク「${taskTitle}」を削除しました`,
          duration: 3000
        });
        
        // データを再取得
        fetchTasks();
      }
    } catch (err) {
      console.error('タスク削除中にエラーが発生しました:', err);
      // エラー通知はAPI共通処理で表示されるためここでは追加しない
    }
  };

  // タスク作成/編集完了ハンドラ
  const handleTaskFormClose = (refreshNeeded: boolean, taskTitle?: string) => {
    setIsFormOpen(false);
    
    if (refreshNeeded) {
      // 成功通知を表示
      const actionText = selectedTask ? '更新' : '作成';
      const title = taskTitle || (selectedTask?.title || 'タスク');
      
      addNotification({
        type: 'success',
        message: `タスク「${title}」を${actionText}しました`,
        duration: 3000
      });
      
      fetchTasks();
    }
  };

  // サブタスク作成完了ハンドラ
  const handleSubtaskFormClose = (refreshNeeded: boolean, taskTitle?: string) => {
    setIsSubtaskFormOpen(false);
    
    if (refreshNeeded) {
      // 成功通知を表示
      const parentName = parentTask?.title || 'タスク';
      const childName = taskTitle || 'サブタスク';
      
      addNotification({
        type: 'success',
        message: `「${parentName}」にサブタスク「${childName}」を追加しました`,
        duration: 3000
      });
      
      fetchTasks();
    }
  };

  // 表示モード変更ハンドラ
  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode) {
      setViewMode(newMode);
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
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}>
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
          
          {/* デスクトップ用の新規タスクボタン */}
          {!isMobile && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
              disabled={!currentFamily.id || loading}
            >
              新規タスク
            </Button>
          )}
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

        {/* フィルターパネルと表示モード切替 */}
        <Box sx={{ mb: 3 }}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 2 : 0,
            }}>
              <Box sx={{ width: '100%' }}>
                <TaskFilterPanel
                  filters={displayFilters}
                  onFilterChange={handleFilterChange}
                  disabled={loading}
                />
              </Box>
              
              {/* タブレットより大きい画面でのみ表示モード切替を表示 */}
              {!isTablet && (
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={handleViewModeChange}
                  aria-label="表示モード"
                  size="small"
                  sx={{ 
                    ml: 2,
                    alignSelf: 'center'
                  }}
                >
                  <ToggleButton value="flat" aria-label="フラットビュー">
                    <ViewListIcon />
                  </ToggleButton>
                  <ToggleButton value="tree" aria-label="ツリービュー">
                    <AccountTreeIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'tree' && !isTablet ? (
        <TaskListWithSubtasks
          tasks={tasks}
          onEdit={handleOpenEditDialog}
          onDelete={handleDeleteTask}
          onAddSubtask={handleOpenSubtaskDialog}
          total={totalTasks}
          page={Math.floor(filtersRef.current.skip / filtersRef.current.limit)}
          rowsPerPage={filtersRef.current.limit}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      ) : (
        <TaskList
          tasks={tasks}
          onEdit={handleOpenEditDialog}
          onDelete={handleDeleteTask}
          onAddSubtask={handleOpenSubtaskDialog}
          total={totalTasks}
          page={Math.floor(filtersRef.current.skip / filtersRef.current.limit)}
          rowsPerPage={filtersRef.current.limit}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      )}

      {/* モバイル用のフローティングアクションボタン */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="新規タスク"
          onClick={handleOpenCreateDialog}
          disabled={!currentFamily.id || loading}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1050,
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {isFormOpen && currentFamily.id && (
        <TaskFormDialog
          open={isFormOpen}
          task={selectedTask}
          onClose={handleTaskFormClose}
          familyId={currentFamily.id}
        />
      )}

      {isSubtaskFormOpen && parentTask && (
        <SubtaskFormDialog
          open={isSubtaskFormOpen}
          parentTask={parentTask}
          onClose={handleSubtaskFormClose}
        />
      )}
    </Container>
  );
};

export default TasksPage;
