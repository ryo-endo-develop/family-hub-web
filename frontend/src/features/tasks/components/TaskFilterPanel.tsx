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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { FilterList as FilterListIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';

import { TaskFilter } from '../types';

interface TaskFilterPanelProps {
  filters: TaskFilter;
  onFilterChange: (filters: Partial<TaskFilter>) => void;
  disabled?: boolean;
}

/**
 * タスクのフィルターパネルコンポーネント
 * 無限ループを防ぐため、フィルター変更時のみonFilterChangeを呼び出す
 */
const TaskFilterPanel = ({ filters, onFilterChange, disabled = false }: TaskFilterPanelProps) => {
  const [expanded, setExpanded] = useState(false);

  // フィルターの展開/折りたたみを切り替え
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // フィルターをクリア
  const clearFilters = () => {
    if (disabled) return;
    
    // 明示的に変更が必要なフィルターのみを更新
    const clearedFilters: Partial<TaskFilter> = {
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
    
    const value = event.target.value === '' ? undefined : event.target.value as 'pending' | 'in_progress' | 'completed';
    onFilterChange({ status: value });
  };

  // 優先度変更ハンドラ
  const handlePriorityChange = (event: SelectChangeEvent<string>) => {
    if (disabled) return;
    
    const value = event.target.value === '' ? undefined : event.target.value as 'low' | 'medium' | 'high';
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

  return (
    <>
      {/* ヘッダー部分 */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FilterListIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">フィルター</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            size="small"
            onClick={clearFilters}
            sx={{ 
              color: 'primary.main',
              mr: 2,
              fontWeight: 'normal'
            }}
            disabled={disabled}
          >
            クリア
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={toggleExpanded}
            sx={{ 
              borderRadius: '20px',
              minWidth: '80px'
            }}
            disabled={disabled}
          >
            {expanded ? '閉じる' : '開く'}
          </Button>
        </Box>
      </Box>

      {/* 区切り線 */}
      <Divider sx={{ mb: 3 }} />

      {/* 折りたたみ可能なフィルタコンテンツ */}
      <Collapse in={expanded}>
        <Box>
          <Grid container spacing={3}>
            {/* ステータス選択 */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel 
                  id="status-label"
                  shrink={true} // ラベルを常に縮小表示
                >
                  ステータス
                </InputLabel>
                <Select
                  labelId="status-label"
                  id="status-select"
                  value={filters.status || ''}
                  label="ステータス"
                  onChange={handleStatusChange}
                  displayEmpty
                  disabled={disabled}
                  renderValue={(selected) => {
                    if (selected === '') {
                      return <Typography sx={{ opacity: 0.6 }}>すべて</Typography>;
                    }
                    
                    const statusLabels: Record<string, string> = {
                      pending: '未着手',
                      in_progress: '進行中',
                      completed: '完了',
                    };
                    
                    return statusLabels[selected as string] || selected;
                  }}
                  sx={{
                    '& .MuiSelect-select': {
                      paddingTop: '8px',
                      paddingBottom: '8px',
                    }
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
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel 
                  id="priority-label"
                  shrink={true} // ラベルを常に縮小表示
                >
                  優先度
                </InputLabel>
                <Select
                  labelId="priority-label"
                  id="priority-select"
                  value={filters.priority || ''}
                  label="優先度"
                  onChange={handlePriorityChange}
                  displayEmpty
                  disabled={disabled}
                  renderValue={(selected) => {
                    if (selected === '') {
                      return <Typography sx={{ opacity: 0.6 }}>すべて</Typography>;
                    }
                    
                    const priorityLabels: Record<string, string> = {
                      high: '高',
                      medium: '中',
                      low: '低',
                    };
                    
                    return priorityLabels[selected as string] || selected;
                  }}
                  sx={{
                    '& .MuiSelect-select': {
                      paddingTop: '8px',
                      paddingBottom: '8px',
                    }
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
            {/* ルーティンタスク切り替え */}
            <Grid item xs={12} md={4}>
              <Box sx={{ 
                height: '100%',
                display: 'flex',
                alignItems: 'center'
              }}>
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
            </Grid>

            {/* 期限日（から） */}
            <Grid item xs={12} md={4}>
              <DatePicker
                label="期限日（から）"
                value={filters.due_after || null}
                onChange={handleDueAfterChange}
                slotProps={{ 
                  textField: { 
                    size: 'small', 
                    fullWidth: true, 
                    disabled: disabled,
                  }
                }}
                disabled={disabled}
              />
            </Grid>

            {/* 期限日（まで） */}
            <Grid item xs={12} md={4}>
              <DatePicker
                label="期限日（まで）"
                value={filters.due_before || null}
                onChange={handleDueBeforeChange}
                slotProps={{ 
                  textField: { 
                    size: 'small', 
                    fullWidth: true, 
                    disabled: disabled,
                  }
                }}
                disabled={disabled}
              />
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </>
  );
};

export default TaskFilterPanel;
