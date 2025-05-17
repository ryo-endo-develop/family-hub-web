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
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useTaskApi } from '../../../api/hooks/useTaskApi';
import { useFamilyApi } from '../../../api/hooks/useFamilyApi';
import { useTagApi } from '../../../api/hooks/useTagApi';
import { Task, TaskCreate, Tag, taskCreateSchema } from '../types';
import { useAppSelector } from '../../../hooks/reduxHooks';

// 家族メンバーの型
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

// 落ち着いた中間色調のタグカラーパレット
const tagPalette = {
  // メインカラー (落ち着いた中間色調)
  blue: '#5c6bc0',     // 落ち着いたブルー
  teal: '#26a69a',     // 落ち着いたティール
  green: '#66bb6a',    // 落ち着いたグリーン
  amber: '#ffca28',    // 落ち着いたアンバー
  orange: '#ffa726',   // 落ち着いたオレンジ
  red: '#ef5350',      // 落ち着いたレッド
  pink: '#ec407a',     // 落ち着いたピンク
  purple: '#ab47bc',   // 落ち着いたパープル
  indigo: '#5c6bc0',   // 落ち着いたインディゴ
  deepPurple: '#7e57c2', // 深いパープル
  cyan: '#4dd0e1',     // シアン
  blueGrey: '#78909c', // ブルーグレー
  
  // 暗いカラーパレット (白いテキスト用)
  dark: {
    blue: '#3949ab',    // 暗めのブルー
    teal: '#00796b',    // 暗めのティール
    green: '#2e7d32',   // 暗めのグリーン
    red: '#d32f2f',     // 暗めのレッド
    purple: '#7b1fa2',  // 暗めのパープル
    brown: '#5d4037',   // 暗めのブラウン
    blueGrey: '#455a64' // 暗めのブルーグレー
  },
  
  // コントラスト色計算用
  isDark: (color: string): boolean => {
    // 簡易的な明度判定（背景色の明るさに基づいて文字色を選ぶ）
    if (!color || !color.startsWith('#')) return false;
    
    // 16進数のカラーコードを解析（短縮形も対応）
    let r, g, b;
    if (color.length === 4) {
      r = parseInt(color.charAt(1) + color.charAt(1), 16);
      g = parseInt(color.charAt(2) + color.charAt(2), 16);
      b = parseInt(color.charAt(3) + color.charAt(3), 16);
    } else {
      r = parseInt(color.substring(1, 3), 16);
      g = parseInt(color.substring(3, 5), 16);
      b = parseInt(color.substring(5, 7), 16);
    }
    
    // YIQを使った明度計算（明度が145未満は暗い色と判定 - より安全なコントラストのために閾値を上げた）
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq < 145;
  }
};

const TaskFormDialog = ({ open, task, onClose, familyId }: TaskFormDialogProps) => {
  const theme = useTheme();
  const { user } = useAppSelector((state) => state.auth);
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
  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TaskCreate>({
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
  // タイトルも監視
  const currentTitle = watch('title');

  // タグの色を取得するヘルパー関数
  // タグごとに一貫した落ち着いた色を生成
  const getTagColor = useCallback((tag: Tag, isSelected: boolean, useDarkVariant: boolean = false) => {
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
    
    // 暗いバージョンがリクエストされた場合は、darkパレットから選択
    if (useDarkVariant) {
      const darkColorKeys = Object.keys(tagPalette.dark);
      const darkColorKey = darkColorKeys[seed % darkColorKeys.length];
      // @ts-ignore
      return tagPalette.dark[darkColorKey];
    }
    
    // 通常はメインパレットから選択
    const colorKeys = Object.keys(tagPalette).filter(key => 
      key !== 'isDark' && key !== 'dark' // 関数とdarkパレットを除外
    );
    const colorKey = colorKeys[seed % colorKeys.length];
    // @ts-ignore
    return tagPalette[colorKey];
  }, []);

  // 家族メンバーとタグを取得する関数
  const fetchFamilyData = useCallback(async (familyId: string) => {
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
  }, [familyApi, tagApi]);  // APIフックを依存配列に追加

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
        dueDate = typeof task.due_date === 'string' 
          ? new Date(task.due_date) 
          : task.due_date;
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
    
    if (data.due_date && !(data.due_date instanceof Date)) {
      // Date型に変換を試みる
      try {
        data.due_date = new Date(data.due_date);
      } catch (e) {
        console.error("日付変換エラー:", e);
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
                    onChange={(newValue) => {
                      // nullまたはDateオブジェクトを確実に渡す
                      if (newValue && !(newValue instanceof Date)) {
                        try {
                          field.onChange(new Date(newValue));
                        } catch (e) {
                          console.error("日付変換エラー:", e);
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
                        onChange={(e) => field.onChange(e.target.checked)}
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
                      onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                      disabled={familyMembers.length === 0}
                    >
                      <MenuItem value="">未割当</MenuItem>
                      {familyMembers.map((member) => (
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
                          <ListItemText primary={`${member.user.last_name} ${member.user.first_name}`} />
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
                  tags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    
                    return (
                      <Chip
                        key={tag.id}
                        label={tag.name}
                        onClick={() => handleTagToggle(tag.id)}
                        size="small"
                        color={isSelected ? "primary" : "default"}
                        variant={isSelected ? "filled" : "outlined"}
                        sx={{
                          // タグの色を取得
                          bgcolor: isSelected ? undefined : getTagColor(tag, isSelected),
                          borderColor: isSelected ? undefined : getTagColor(tag, isSelected),
                          // 明度に基づいて適切な文字色を選択 - 明るい背景色には暗い文字を使用
                          color: (() => {
                            if (isSelected) return undefined;
                            
                            const color = getTagColor(tag, isSelected);
                            if (!color) return 'rgba(0, 0, 0, 0.87)';
                            
                            // 明るい背景色には濃い新字の黒を使い、暗い背景色には白を使う
                            return tagPalette.isDark(color) ? '#ffffff' : 'rgba(0, 0, 0, 0.87)';
                          })(),
                          // アニメーションとホバー時の効果
                          transition: 'all 0.15s ease-in-out',
                          transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                          fontWeight: isSelected ? 600 : 500,
                          boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' : 'none',
                          '&:hover': {
                            // ホバー時は兄弟に透明度を下げる
                            bgcolor: isSelected ? undefined : 
                              (color => color ? `${color}` : undefined)(getTagColor(tag, isSelected)),
                            opacity: 0.85,
                            transform: 'scale(1.03)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          },
                          // 丸みを萬道で高すぎないように調整
                          borderRadius: '12px',
                          px: 1.2,
                          py: 0.4,
                          height: 'auto',
                          minHeight: '24px',
                          // 選択状態をより明確に
                          ...(isSelected && {
                            fontWeight: 600,
                            letterSpacing: '0.01em',
                          })
                        }}
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
              render={({ field }) => (
                <input type="hidden" {...field} />
              )}
            />

            {/* タグIDsフィールド（非表示） */}
            <Controller
              name="tag_ids"
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
            disabled={submitting || isLoadingData}
          >
            {submitting ? '保存中...' : (task ? '更新' : '作成')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TaskFormDialog;
