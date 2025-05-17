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
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useTaskApi } from '../../../../api/hooks/useTaskApi';
import { SubtaskCreate, Task, subtaskCreateSchema } from '../../types';
import { useAppSelector } from '../../../../hooks/reduxHooks';

interface SubtaskFormDialogProps {
  open: boolean;
  parentTask: Task; // 親タスク
  onClose: (refreshNeeded: boolean) => void;
}

const SubtaskFormDialog = ({ open, parentTask, onClose }: SubtaskFormDialogProps) => {
  const { user } = useAppSelector((state) => state.auth);
  const taskApi = useTaskApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // React Hook Formの設定
  const { control, handleSubmit, reset, formState: { errors } } = useForm<SubtaskCreate>({
    resolver: zodResolver(subtaskCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      is_routine: false,
      due_date: null,
      assignee_id: null,
      tag_ids: [],
    },
  });

  // ダイアログが開くたびにフォームをリセット
  useEffect(() => {
    if (open) {
      reset({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        is_routine: false,
        due_date: null,
        assignee_id: null,
        tag_ids: [],
      });
    }
  }, [open, reset]);

  // フォーム送信ハンドラ
  const onSubmit: SubmitHandler<SubtaskCreate> = async (data) => {
    setSubmitting(true);
    setError(null);
    
    try {
      // サブタスク作成
      const result = await taskApi.createSubtask(parentTask.id, data);
      if (!result && taskApi.error) {
        setError(taskApi.error);
        return;
      }
      
      onClose(true); // 更新があったことを通知
    } catch (error: any) {
      console.error('Failed to save subtask:', error);
      setError(error.message || 'サブタスクの保存に失敗しました');
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
        <DialogTitle>
          サブタスクを作成
          <Typography variant="subtitle2" color="text.secondary">
            親タスク: {parentTask.title}
          </Typography>
        </DialogTitle>
        
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
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose}>キャンセル</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
          >
            {submitting ? '保存中...' : '作成'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SubtaskFormDialog;
