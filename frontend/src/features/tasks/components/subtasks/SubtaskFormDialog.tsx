import { useEffect, useState, useCallback, useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
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
  Box,
  Chip,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { useTagApi } from '../../../../api/hooks/useTagApi';
import { useTaskApi } from '../../../../api/hooks/useTaskApi';
import { getTagChipStyles } from '../../../../utils/tagUtils';
import { SubtaskCreate, Tag, Task, subtaskCreateSchema } from '../../types';

interface SubtaskFormDialogProps {
  open: boolean;
  parentTask: Task; // 親タスク
  onClose: (refreshNeeded: boolean, taskTitle?: string) => void;
}

const SubtaskFormDialog = ({ open, parentTask, onClose }: SubtaskFormDialogProps) => {
  const taskApi = useTaskApi();
  const tagApi = useTagApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // React Hook Formの設定
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubtaskCreate>({
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

  // 選択中のタグIDを監視
  const selectedTagIds = watch('tag_ids') || [];

  // タグデータの取得
  const fetchTags = useCallback(async () => {
    if (!parentTask.family_id) return;
    
    setIsLoadingTags(true);
    try {
      const tagsResult = await tagApi.getFamilyTags(parentTask.family_id);
      if (tagsResult) {
        setTags(tagsResult);
      }
    } catch (err) {
      console.error('タグの取得に失敗しました:', err);
    } finally {
      setIsLoadingTags(false);
    }
  }, [parentTask.family_id, tagApi]);

  // 前回のopen状態を保持するref
  const prevOpenRef = useRef(false);

  // ダイアログが開くたびにフォームをリセットし、タグを取得
  useEffect(() => {
    // openがfalseからtrueに変わった場合のみ実行
    if (open && !prevOpenRef.current) {
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
      
      // タグを取得
      fetchTags();
    }
    
    // 現在のopen状態を保存
    prevOpenRef.current = open;
  }, [open, reset, fetchTags]);

  // フォーム送信ハンドラ
  const onSubmit: SubmitHandler<SubtaskCreate> = async data => {
    setSubmitting(true);
    setError(null);

    try {
      // 日付の処理
      if (data.due_date && !(data.due_date instanceof Date)) {
        try {
          data.due_date = new Date(data.due_date);
        } catch (e) {
          data.due_date = null;
        }
      }

      // タグデータを確認
      if (!data.tag_ids) {
        data.tag_ids = [];
      }

      // サブタスク作成
      const result = await taskApi.createSubtask(parentTask.id, data);
      if (!result && taskApi.error) {
        setError(taskApi.error);
        return;
      }

      // 更新があったことを通知し、タイトルも渡す
      onClose(true, data.title);
    } catch (error: unknown) {
      setError(
        error instanceof Error 
          ? error.message 
          : 'サブタスクの保存に失敗しました'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ダイアログを閉じる
  const handleClose = () => {
    onClose(false);
  };

  // タグ選択の切り替え処理
  const handleTagToggle = (tagId: string) => {
    // 現在のタグID配列を取得
    const currentTagIds = selectedTagIds || [];
    
    // 既に選択されていれば削除、なければ追加
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter(id => id !== tagId)
      : [...currentTagIds, tagId];
    
    // フォームの値を更新
    setValue('tag_ids', newTagIds);
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

            {/* タグ選択 */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                タグ
              </Typography>
              {isLoadingTags ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : tags.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  利用可能なタグがありません
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {tags.map(tag => {
                    const isSelected = selectedTagIds.includes(tag.id);

                    return (
                      <Chip
                        key={tag.id}
                        label={tag.name}
                        onClick={() => handleTagToggle(tag.id)}
                        size="small"
                        color={isSelected ? 'primary' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        sx={getTagChipStyles(tag, isSelected)}
                      />
                    );
                  })}
                </Box>
              )}
              
              {/* タグIDフィールド（非表示） */}
              <Controller
                name="tag_ids"
                control={control}
                render={({ field }) => <input type="hidden" {...field} />}
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
                    onChange={newValue => {
                      // nullまたはDateオブジェクトを確実に渡す
                      if (newValue && !(newValue instanceof Date)) {
                        try {
                          field.onChange(new Date(newValue));
                        } catch (e) {
                          field.onChange(null);
                        }
                      } else {
                        field.onChange(newValue);
                      }
                    }}
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
                        onChange={e => field.onChange(e.target.checked)}
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
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? '保存中...' : '作成'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SubtaskFormDialog;
