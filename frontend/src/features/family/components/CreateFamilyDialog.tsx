import React, { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { useFamilyApi } from '../../../api/hooks/useFamilyApi';

// バリデーションスキーマ
const familySchema = z.object({
  name: z.string().min(1, '家族名を入力してください'),
});

type FamilyFormInputs = z.infer<typeof familySchema>;

interface CreateFamilyDialogProps {
  open: boolean;
  onClose: (refresh?: boolean, familyName?: string) => void;
}

const CreateFamilyDialog: React.FC<CreateFamilyDialogProps> = ({ open, onClose }) => {
  const { createFamily, loading, error } = useFamilyApi();

  // React Hook Formの設定
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FamilyFormInputs>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      name: '',
    },
  });

  // ダイアログが開くたびにフォームをリセット
  useEffect(() => {
    if (open) {
      reset({
        name: '',
      });
    }
  }, [open, reset]);

  // 家族作成を処理する関数
  const onSubmit = async (data: FamilyFormInputs) => {
    try {
      const result = await createFamily({ name: data.name });
      if (result) {
        onClose(true, result.name);
      }
    } catch (error) {
      console.error('家族作成中にエラーが発生しました:', error);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>新しい家族を作成</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="家族名"
                fullWidth
                margin="normal"
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={loading}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onClose()} disabled={loading}>
            キャンセル
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : '作成'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateFamilyDialog;
