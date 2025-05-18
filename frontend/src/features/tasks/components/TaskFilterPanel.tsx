import { useState, useMemo } from 'react';

import {
  FilterList as FilterListIcon,
  Close as CloseIcon,
  EventNote as DateIcon,
  PriorityHigh as PriorityIcon,
  Autorenew as RoutineIcon,
  Assignment as StatusIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Collapse,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Switch,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
  Chip,
  IconButton,
  Drawer,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
// prettier-ignore
import { format } from 'date-fns';
// prettier-ignore
import ja from 'date-fns/locale/ja';

import { TaskFilter } from '../types';

// タスクフィルタパネルの拡張
interface ExtendedTaskFilter extends TaskFilter {
  priority?: 'low' | 'medium' | 'high';
}

interface TaskFilterPanelProps {
  filters: ExtendedTaskFilter;
  onFilterChange: (filters: Partial<ExtendedTaskFilter>) => void;
  disabled?: boolean;
}

/**
 * タスクのフィルターパネルコンポーネント
 * レスポンシブデザイン対応
 */
const TaskFilterPanel = ({ filters, onFilterChange, disabled = false }: TaskFilterPanelProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // モバイル用のドロワーの表示状態
  const [drawerOpen, setDrawerOpen] = useState(false);
  // デスクトップ用のパネル展開状態
  const [expanded, setExpanded] = useState(false);

  // フィルターの展開/折りたたみを切り替え
  const toggleExpanded = () => {
    if (isMobile) {
      setDrawerOpen(!drawerOpen);
    } else {
      setExpanded(!expanded);
    }
  };

  // フィルターをクリア
  const clearFilters = () => {
    if (disabled) return;

    // 明示的に変更が必要なフィルターのみを更新
    const clearedFilters: Partial<ExtendedTaskFilter> = {
      status: undefined,
      priority: undefined,
      assignee_id: undefined,
      is_routine: undefined,
      due_before: undefined,
      due_after: undefined,
      tag_ids: undefined,
    };

    onFilterChange(clearedFilters);
  };

  // ステータス変更ハンドラ
  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    if (disabled) return;

    const value =
      event.target.value === ''
        ? undefined
        : (event.target.value as 'pending' | 'in_progress' | 'completed');
    onFilterChange({ status: value });
  };

  // 優先度変更ハンドラ
  const handlePriorityChange = (event: SelectChangeEvent<string>) => {
    if (disabled) return;

    const value =
      event.target.value === '' ? undefined : (event.target.value as 'low' | 'medium' | 'high');
    onFilterChange({ priority: value });
  };

  // ルーティンタスク切り替えハンドラ
  const handleRoutineChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onFilterChange({ is_routine: event.target.checked });
  };

  // 期限日（から）変更ハンドラ
  const handleDueAfterChange = (date: Date | null) => {
    if (disabled) return;
    onFilterChange({ due_after: date || undefined });
  };

  // 期限日（まで）変更ハンドラ
  const handleDueBeforeChange = (date: Date | null) => {
    if (disabled) return;
    onFilterChange({ due_before: date || undefined });
  };

  // 適用されているフィルターの数を計算
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.priority) count++;
    if (filters.is_routine) count++;
    if (filters.due_after) count++;
    if (filters.due_before) count++;
    if (filters.assignee_id) count++;
    if (filters.tag_ids && filters.tag_ids.length > 0) count++;
    return count;
  }, [filters]);

  // フィルターチップを生成する関数
  const renderFilterChips = () => {
    const chips = [];

    // ステータスフィルター
    if (filters.status) {
      const statusLabels: Record<string, string> = {
        pending: '未着手',
        in_progress: '進行中',
        completed: '完了',
      };

      chips.push(
        <Chip
          key="status"
          icon={<StatusIcon />}
          label={`ステータス: ${statusLabels[filters.status]}`}
          onDelete={() => onFilterChange({ status: undefined })}
          color="primary"
          variant="outlined"
          size="small"
        />,
      );
    }

    // 優先度フィルター
    if (filters.priority) {
      const priorityLabels: Record<string, string> = {
        high: '高',
        medium: '中',
        low: '低',
      };

      chips.push(
        <Chip
          key="priority"
          icon={<PriorityIcon />}
          label={`優先度: ${priorityLabels[filters.priority]}`}
          onDelete={() => onFilterChange({ priority: undefined })}
          color="primary"
          variant="outlined"
          size="small"
        />,
      );
    }

    // ルーティンフィルター
    if (filters.is_routine) {
      chips.push(
        <Chip
          key="routine"
          icon={<RoutineIcon />}
          label="ルーティンタスクのみ"
          onDelete={() => onFilterChange({ is_routine: undefined })}
          color="primary"
          variant="outlined"
          size="small"
        />,
      );
    }

    // 期限日（から）フィルター
    if (filters.due_after) {
      const formattedDate = format(new Date(filters.due_after), 'yyyy/MM/dd', { locale: ja });
      chips.push(
        <Chip
          key="due_after"
          icon={<DateIcon />}
          label={`期限日 ${formattedDate} から`}
          onDelete={() => onFilterChange({ due_after: undefined })}
          color="primary"
          variant="outlined"
          size="small"
        />,
      );
    }

    // 期限日（まで）フィルター
    if (filters.due_before) {
      const formattedDate = format(new Date(filters.due_before), 'yyyy/MM/dd', { locale: ja });
      chips.push(
        <Chip
          key="due_before"
          icon={<DateIcon />}
          label={`期限日 ${formattedDate} まで`}
          onDelete={() => onFilterChange({ due_before: undefined })}
          color="primary"
          variant="outlined"
          size="small"
        />,
      );
    }

    return chips;
  };

  // フィルターフォームコンテンツ（デスクトップ・モバイル共通）
  const filterFormContent = (
    <Box sx={{ p: isMobile ? 2 : 0 }}>
      <Grid container spacing={3}>
        {/* ステータス選択 */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="status-label">ステータス</InputLabel>
            <Select
              labelId="status-label"
              id="status-select"
              value={filters.status || ''}
              label="ステータス"
              onChange={handleStatusChange}
              displayEmpty
              disabled={disabled}
              renderValue={selected => {
                if (selected === '') {
                  return <Typography sx={{ opacity: 0.6 }}>すべて</Typography>;
                }

                const statusLabels: Record<string, string> = {
                  pending: '未着手',
                  in_progress: '進行中',
                  completed: '完了',
                };

                return (
                  statusLabels[selected as 'pending' | 'in_progress' | 'completed'] || selected
                );
              }}
            >
              <MenuItem value="">すべて</MenuItem>
              <MenuItem value="pending">未着手</MenuItem>
              <MenuItem value="in_progress">進行中</MenuItem>
              <MenuItem value="completed">完了</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* 優先度選択 */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="priority-label">優先度</InputLabel>
            <Select
              labelId="priority-label"
              id="priority-select"
              value={filters.priority || ''}
              label="優先度"
              onChange={handlePriorityChange}
              displayEmpty
              disabled={disabled}
              renderValue={selected => {
                if (selected === '') {
                  return <Typography sx={{ opacity: 0.6 }}>すべて</Typography>;
                }

                const priorityLabels: Record<string, string> = {
                  high: '高',
                  medium: '中',
                  low: '低',
                };

                return priorityLabels[selected as 'low' | 'medium' | 'high'] || selected;
              }}
            >
              <MenuItem value="">すべて</MenuItem>
              <MenuItem value="high">高</MenuItem>
              <MenuItem value="medium">中</MenuItem>
              <MenuItem value="low">低</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* 期限日（から） */}
        <Grid item xs={12} sm={6}>
          <DatePicker
            label="期限日（から）"
            value={filters.due_after || null}
            onChange={handleDueAfterChange}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
                disabled: disabled,
              },
            }}
            disabled={disabled}
          />
        </Grid>

        {/* 期限日（まで） */}
        <Grid item xs={12} sm={6}>
          <DatePicker
            label="期限日（まで）"
            value={filters.due_before || null}
            onChange={handleDueBeforeChange}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
                disabled: disabled,
              },
            }}
            disabled={disabled}
          />
        </Grid>
      </Grid>

      {/* ルーティンタスク切り替え */}
      <Box
        sx={{
          mt: 2,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={filters.is_routine || false}
              onChange={handleRoutineChange}
              name="is_routine"
              disabled={disabled}
            />
          }
          label="ルーティンタスクのみ"
        />
      </Box>

      {/* ボタン部分 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mt: 3,
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={clearFilters}
          disabled={disabled || activeFilterCount === 0}
        >
          クリア
        </Button>
        {isMobile && (
          <Button variant="contained" size="small" onClick={() => setDrawerOpen(false)}>
            適用
          </Button>
        )}
      </Box>
    </Box>
  );

  // モバイル用ドロワー
  const filterDrawer = (
    <Drawer
      anchor="bottom"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      PaperProps={{
        sx: {
          maxHeight: '80vh',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          p: 2,
        },
      }}
    >
      {/* ドロワーヘッダー */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6">フィルター</Typography>
        <IconButton onClick={() => setDrawerOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {/* フィルターフォーム */}
      {filterFormContent}
    </Drawer>
  );

  return (
    <>
      {/* フィルターヘッダー（デスクトップ・モバイル共通） */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: isTablet ? 1 : 2,
        }}
      >
        {/* 左側：フィルタータイトルと適用されているフィルターのチップ */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            flex: 1,
          }}
        >
          <Button
            startIcon={<FilterListIcon />}
            variant={activeFilterCount > 0 ? 'contained' : 'outlined'}
            onClick={toggleExpanded}
            size="small"
            color={activeFilterCount > 0 ? 'primary' : 'inherit'}
            sx={{
              borderRadius: '20px',
              mb: isTablet ? 1 : 0,
            }}
            disabled={disabled}
          >
            {activeFilterCount > 0 ? `フィルター (${activeFilterCount})` : 'フィルター'}
          </Button>

          {/* アクティブなフィルターのチップ表示 */}
          {!isMobile && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {renderFilterChips()}
            </Stack>
          )}
        </Box>

        {/* 右側：デスクトップ用の開閉ボタン（モバイルでは非表示） */}
        {!isMobile && activeFilterCount > 0 && (
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            onClick={clearFilters}
            sx={{ ml: 'auto' }}
            disabled={disabled}
          >
            クリア
          </Button>
        )}
      </Box>

      {/* モバイルチップエリア（モバイルのみ表示） */}
      {isMobile && activeFilterCount > 0 && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {renderFilterChips()}
          </Stack>
        </Box>
      )}

      {/* 折りたたみ式フィルター（デスクトップ用） */}
      {!isMobile && (
        <Collapse in={expanded}>
          <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider' }}>
            {filterFormContent}
          </Paper>
        </Collapse>
      )}

      {/* モバイル用ドロワー */}
      {isMobile && filterDrawer}
    </>
  );
};

export default TaskFilterPanel;
