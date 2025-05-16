import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useTaskApi } from '../../../api/hooks/useTaskApi';
import { Task, TaskCreate, taskCreateSchema } from '../types';
import { useAppSelector } from '../../../hooks/reduxHooks';

interface TaskFormDialogProps {
  open: boolean;
  task: Task | null; // 編集時はタスクオブジェクト、新規作成時はnull
  onClose: (refreshNeeded: boolean) => void;
  familyId: string;
}

const TaskFormDialog = ({ open, task, onClose, familyId }: TaskFormDialogProps) => {
  const { user } = useAppSelector((state) => state.auth);
  const taskApi = useTaskApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // React Hook Formの設定
  const { control, handleSubmit, reset, formState: { errors } } = useForm<TaskCreate>({
    resolver: zodResolver(taskCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      is_routine: false,
      due_date: null,
      family_id: familyId,
      assignee_id: null,
      tag_ids: [],
    },
  });

  // 家族IDが変更されたらフォームの値を更新
  useEffect(() => {
    if (familyId) {
      reset(current => ({
        ...current,
        family_id: familyId,
      }));
    }
  }, [familyId, reset]);

  // タスク編集時にフォームの初期値を設定
  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        is_routine: task.is_routine,
        due_date: task.due_date,
        family_id: task.family_id,
        assignee_id: task.assignee_id || null,
        tag_ids: task.tags.map(tag => tag.id),
      });
    } else {
      reset({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        is_routine: false,
        due_date: null,
        family_id: familyId,
        assignee_id: null,
        tag_ids: [],
      });
    }
  }, [task, reset, familyId]);

  // フォーム送信ハンドラ
  const onSubmit: SubmitHandler<TaskCreate> = async (data) => {
    if (!familyId) {
      setError("家族IDが指定されていません");
      return;
    }
    
    // 念のため最新の家族IDを設定
    data.family_id = familyId;
    
    setSubmitting(true);
    setError(null);
    
    try {
      if (task) {
        // タスク更新
        const result = await taskApi.updateTask(task.id, data);
        if (!result && taskApi.error) {
          setError(taskApi.error);
          return;
        }
      } else {
        // タスク作成
        const result = await taskApi.createTask(data);
        if (!result && taskApi.error) {
          setError(taskApi.error);
          return;
        }
      }
      
      onClose(true); // 更新があったことを通知
    } catch (error: any) {
      console.error('Failed to save task:', error);
      setError(error.message || 'タスクの保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  // ダイアログを閉じる
  const handleClose = () => {
    onClose(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{task ? 'タスクを編集' : '新規タスク'}</DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="タイトル"
                    fullWidth
                    required
                    error={!!errors.title}
                    helperText={errors.title?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="詳細"
                    fullWidth
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel id="status-label">ステータス</InputLabel>
                    <Select
                      {...field}
                      labelId="status-label"
                      label="ステータス"
                      error={!!errors.status}
                    >
                      <MenuItem value="pending">未着手</MenuItem>
                      <MenuItem value="in_progress">進行中</MenuItem>
                      <MenuItem value="completed">完了</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel id="priority-label">優先度</InputLabel>
                    <Select
                      {...field}
                      labelId="priority-label"
                      label="優先度"
                      error={!!errors.priority}
                    >
                      <MenuItem value="low">低</MenuItem>
                      <MenuItem value="medium">中</MenuItem>
                      <MenuItem value="high">高</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="due_date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="期限日"
                    value={field.value}
                    onChange={field.onChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.due_date,
                        helperText: errors.due_date?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="is_routine"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="ルーティンタスク"
                  />
                )}
              />
            </Grid>
            
            {/* 将来的にはタグ選択や担当者選択を追加 */}
            
            {/* 家族IDフィールド（非表示） */}
            <Controller
              name="family_id"
              control={control}
              render={({ field }) => (
                <input type="hidden" {...field} />
              )}
            />
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose}>キャンセル</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
          >
            {submitting ? '保存中...' : (task ? '更新' : '作成')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TaskFormDialog;
