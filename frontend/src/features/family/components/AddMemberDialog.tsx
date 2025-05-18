import React, { useEffect } from 'react';


import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  FormHelperText,
} from '@mui/material';
import { AxiosError } from 'axios';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { useFamilyApi } from '../../../api/hooks/useFamilyApi';

// API エラーレスポンスの型定義
interface ApiErrorResponse {
  detail?: string;
  message?: string;
}

// バリデーションスキーマ
const memberSchema = z.object({
  user_email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .min(1, 'メールアドレスを入力してください'),
  role: z.string().min(1, '役割を選択してください'),
  is_admin: z.boolean().default(false),
});

type MemberFormInputs = z.infer<typeof memberSchema>;

interface AddMemberDialogProps {
  open: boolean;
  familyId: string;
  onClose: (refresh?: boolean, memberEmail?: string) => void;
}

const AddMemberDialog: React.FC<AddMemberDialogProps> = ({ open, familyId, onClose }) => {
  const { addFamilyMember, loading, error } = useFamilyApi();

  // React Hook Formの設定
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MemberFormInputs>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      user_email: '',
      role: 'parent',
      is_admin: false,
    },
  });

  // ダイアログが開くたびにフォームをリセット
  useEffect(() => {
    if (open) {
      reset({
        user_email: '',
        role: 'parent',
        is_admin: false,
      });
    }
  }, [open, reset]);

  // メンバー追加を処理する関数
  const onSubmit = async (data: MemberFormInputs) => {
    if (!familyId) return;

    try {
      // メンバー追加を実行
      const result = await addFamilyMember(familyId, data);
      // 成功時のみダイアログを閉じる
      if (result) {
        onClose(true, data.user_email);
      }
      // 失敗時はダイアログを開いたままエラー表示
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.error('メンバー追加中にエラーが発生しました:', axiosError);
      // エラーはフック内で処理されるのでここでは何もしない
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>家族メンバーを追加</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Controller
            name="user_email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="メールアドレス"
                fullWidth
                margin="normal"
                error={!!errors.user_email}
                helperText={errors.user_email?.message}
                disabled={loading}
              />
            )}
          />

          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth margin="normal" error={!!errors.role} disabled={loading}>
                <InputLabel id="role-label">役割</InputLabel>
                <Select {...field} labelId="role-label" label="役割">
                  <MenuItem value="parent">親</MenuItem>
                  <MenuItem value="child">子</MenuItem>
                  <MenuItem value="other">その他</MenuItem>
                </Select>
                {errors.role && <FormHelperText>{errors.role.message}</FormHelperText>}
              </FormControl>
            )}
          />

          <Controller
            name="is_admin"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.value}
                    onChange={e => field.onChange(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="管理者権限を付与"
                sx={{ mt: 2 }}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onClose()} disabled={loading}>
            キャンセル
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : '追加'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddMemberDialog;
