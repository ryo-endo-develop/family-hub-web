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
  CircularProgress,
  Chip,
  Box,
  Avatar,
  ListItemText,
  ListItemAvatar,
  Typography,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { useFamilyApi } from '../../../api/hooks/useFamilyApi';
import { useTagApi } from '../../../api/hooks/useTagApi';
import { useTaskApi } from '../../../api/hooks/useTaskApi';
import { Task, TaskCreate, Tag, taskCreateSchema } from '../types';

// 家族メンバーの型定義
interface FamilyMember {
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

interface TaskFormDialogProps {
  open: boolean;
  task: Task | null; // 編集時はタスクオブジェクト、新規作成時はnull
  onClose: (refreshNeeded: boolean, taskTitle?: string) => void;
  familyId: string;
}

// テーマに沿ったタグカラーパレット
const tagColors = {
  primary: {
    light: '#7986cb',
    main: '#3f51b5',
    dark: '#303f9f',
  },
  secondary: {
    light: '#ff4081',
    main: '#f50057',
    dark: '#c51162',
  },
  success: {
    light: '#81c784',
    main: '#4caf50',
    dark: '#388e3c',
  },
  warning: {
    light: '#ffb74d',
    main: '#ff9800',
    dark: '#f57c00',
  },
  error: {
    light: '#e57373',
    main: '#f44336',
    dark: '#d32f2f',
  },
  grey: {
    light: '#e0e0e0',
    main: '#9e9e9e',
    dark: '#616161',
  },
};

const TaskFormDialog = ({ open, task, onClose, familyId }: TaskFormDialogProps) => {
  const theme = useTheme();
  const taskApi = useTaskApi();
  const familyApi = useFamilyApi();
  const tagApi = useTagApi();

  // 前回のダイアログオープン状態を追跡するref
  const prevOpenRef = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // React Hook Formの設定
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskCreate>({
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

  // 選択中のタグIDを監視
  const selectedTagIds = watch('tag_ids') || [];

  // タグの色を取得するヘルパー関数
  // タグごとに一貫した落ち着いた色を生成
  const getTagColor = useCallback(
    (tag: Tag, isSelected: boolean) => {
      if (isSelected) {
        return undefined; // 選択時はMUIが適用するカラーを使用
      }

      // タグに色が設定されている場合はそれをベースにする
      if (tag.color) {
        // 有効なHEXカラーコードが設定されていればそのまま使用
        if (tag.color.startsWith('#') && (tag.color.length === 7 || tag.color.length === 4)) {
          return tag.color;
        }
      }

      // タグIDを使って一貫した色を生成
      const tagId = tag.id || 'default';
      const seed = tagId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

      // カラーパレットから色を選択
      const colorKeys = Object.keys(tagColors);
      const colorKey = colorKeys[seed % colorKeys.length] as keyof typeof tagColors;
      
      // 明るさレベルも選択（light, main, dark）
      const brightLevels = ['light', 'main', 'dark'] as const;
      const brightLevel = brightLevels[(seed >> 4) % brightLevels.length];
      
      return tagColors[colorKey][brightLevel];
    },
    []
  );

  // タグのスタイルを取得
  const getTagChipStyles = useCallback(
    (tag: Tag, isSelected: boolean) => {
      if (isSelected) {
        // 選択されたタグはMUIのデフォルトスタイルを使用
        return {};
      }
      
      const tagColor = getTagColor(tag, isSelected);
      
      return {
        bgcolor: isSelected ? undefined : tagColor,
        borderColor: isSelected ? undefined : tagColor,
        color: isSelected 
          ? undefined 
          : tagColor && tagColor.toLowerCase().includes('dark') 
            ? '#fff' 
            : 'inherit',
        '&:hover': {
          bgcolor: isSelected 
            ? undefined 
            : tagColor ? `${tagColor}99` : undefined, // 透明度を追加
        },
      };
    },
    [getTagColor]
  );

  // 家族メンバーとタグを取得する関数
  const fetchFamilyData = useCallback(
    async (familyId: string) => {
      if (!familyId) return;

      setIsLoadingData(true);
      try {
        // 家族メンバーの取得
        const membersResult = await familyApi.getFamilyMembers(familyId);
        if (membersResult) {
          setFamilyMembers(membersResult);
        }

        // タグの取得
        const tagsResult = await tagApi.getFamilyTags(familyId);
        if (tagsResult) {
          setTags(tagsResult);
        }
      } catch (err) {
        console.error('家族データの取得に失敗しました:', err);
      } finally {
        setIsLoadingData(false);
      }
    },
    [familyApi, tagApi],
  ); // APIフックを依存配列に追加

  // ダイアログが開かれた時にデータを取得
  useEffect(() => {
    // ダイアログの表示状態が変わった時だけ実行（openがfalseからtrueに変わった時）
    if (open && !prevOpenRef.current && familyId) {
      fetchFamilyData(familyId);
    }

    // ダイアログの表示状態を更新
    prevOpenRef.current = open;
  }, [open, familyId, fetchFamilyData]);

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
      // due_dateの処理を改善
      let dueDate = null;
      if (task.due_date) {
        // 文字列の場合はDateオブジェクトに変換
        dueDate = typeof task.due_date === 'string' ? new Date(task.due_date) : task.due_date;
      }

      reset({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        is_routine: task.is_routine,
        due_date: dueDate,
        family_id: task.family_id,
        assignee_id: task.assignee_id || null,
        tag_ids: task.tags.map((tag: any) => tag.id),
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
  const onSubmit: SubmitHandler<TaskCreate> = async data => {
    if (!familyId) {
      setError('家族IDが指定されていません');
      return;
    }

    // 念のため最新の家族IDを設定
    data.family_id = familyId;

    if (data.due_date && !(data.due_date instanceof Date)) {
      // Date型に変換を試みる
      try {
        data.due_date = new Date(data.due_date);
      } catch (e) {
        console.error('日付変換エラー:', e);
        data.due_date = null; // 変換失敗時はヌルに設定
      }
    }

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

      // 更新があったことを通知し、タイトルも渡す
      onClose(true, data.title);
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

  // タグを選択/解除するハンドラ
  const handleTagToggle = (tagId: string) => {
    const currentTagIds = selectedTagIds || [];
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter(id => id !== tagId)
      : [...currentTagIds, tagId];

    setValue('tag_ids', newTagIds);
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

          {isLoadingData && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress size={24} />
            </Box>
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
                    onChange={newValue => {
                      // nullまたはDateオブジェクトを確実に渡す
                      if (newValue && !(newValue instanceof Date)) {
                        try {
                          field.onChange(new Date(newValue));
                        } catch (e) {
                          console.error('日付変換エラー:', e);
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

            {/* 担当者選択 */}
            <Grid item xs={12}>
              <Controller
                name="assignee_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel id="assignee-label">担当者</InputLabel>
                    <Select
                      {...field}
                      labelId="assignee-label"
                      label="担当者"
                      value={field.value || ''}
                      onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)}
                      disabled={familyMembers.length === 0}
                    >
                      <MenuItem value="">未割当</MenuItem>
                      {familyMembers.map(member => (
                        <MenuItem key={member.user_id} value={member.user_id}>
                          <ListItemAvatar sx={{ minWidth: 36 }}>
                            <Avatar
                              alt={`${member.user.first_name} ${member.user.last_name}`}
                              src={member.user.avatar_url}
                              sx={{ width: 24, height: 24, mr: 1 }}
                            >
                              {member.user.first_name[0]}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={`${member.user.last_name} ${member.user.first_name}`}
                          />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* タグ選択 */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                タグ
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {tags.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    利用可能なタグがありません
                  </Typography>
                ) : (
                  tags.map((tag: Tag) => {
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
                  })
                )}
              </Box>
            </Grid>

            {/* 家族IDフィールド（非表示） */}
            <Controller
              name="family_id"
              control={control}
              render={({ field }) => <input type="hidden" {...field} />}
            />

            {/* タグIDsフィールド（非表示） */}
            <Controller
              name="tag_ids"
              control={control}
              render={({ field }) => <input type="hidden" {...field} />}
            />
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>キャンセル</Button>
          <Button type="submit" variant="contained" disabled={submitting || isLoadingData}>
            {submitting ? '保存中...' : task ? '更新' : '作成'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TaskFormDialog;
