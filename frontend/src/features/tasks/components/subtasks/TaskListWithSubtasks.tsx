import React, { useState } from 'react';

import {
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  MoreHoriz as MoreHorizIcon,
  PriorityHigh as PriorityHighIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import {
  Box,
  Collapse,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  Chip,
} from '@mui/material';
import { format } from 'date-fns';
import { getTagChipStyles } from '../../../../utils/tagUtils';
import ja from 'date-fns/locale/ja';

import { Task } from '../../types';

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask: (parentTask: Task) => void;
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

// １つのタスク行コンポーネント
interface TaskRowProps {
  task: Task;
  level: number;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask: (parentTask: Task) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, level, onEdit, onDelete, onAddSubtask }) => {
  const [open, setOpen] = useState(false);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  // ステータス表示
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Chip
            icon={<CheckCircleIcon />}
            label="完了"
            size="small"
            color="success"
            variant="outlined"
          />
        );
      case 'in_progress':
        return (
          <Chip
            icon={<MoreHorizIcon />}
            label="進行中"
            size="small"
            color="primary"
            variant="outlined"
          />
        );
      default:
        return <Chip label="未着手" size="small" color="default" variant="outlined" />;
    }
  };

  // 優先度表示
  const getPriorityDisplay = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <Chip
            icon={<PriorityHighIcon />}
            label="高"
            size="small"
            color="error"
            variant="outlined"
          />
        );
      case 'medium':
        return <Chip label="中" size="small" color="warning" variant="outlined" />;
      default:
        return <Chip label="低" size="small" color="default" variant="outlined" />;
    }
  };

  // 期限日の表示
  const getDueDateDisplay = (dueDate: Date | null) => {
    if (!dueDate) return '-';

    try {
      return format(dueDate, 'yyyy/MM/dd', { locale: ja });
    } catch (error) {
      return '-';
    }
  };

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell component="th" scope="row" sx={{ paddingLeft: `${level * 24 + 16}px` }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {hasSubtasks && (
              <IconButton aria-label="展開" size="small" onClick={() => setOpen(!open)}>
                {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            )}
            <Typography variant="body1" component="div" sx={{ ml: hasSubtasks ? 1 : 0 }}>
              {task.title}
              {task.is_routine && (
                <Chip label="ルーティン" size="small" color="secondary" sx={{ ml: 1 }} />
              )}
            </Typography>
          </Box>
        </TableCell>
        <TableCell>{getStatusDisplay(task.status)}</TableCell>
        <TableCell>{getPriorityDisplay(task.priority)}</TableCell>
        <TableCell>{getDueDateDisplay(task.due_date)}</TableCell>
        <TableCell>
          {task.assignee ? `${task.assignee.last_name} ${task.assignee.first_name}` : '-'}
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {task.tags.map(tag => (
              <Chip
                key={tag.id}
                label={tag.name}
                size="small"
                sx={getTagChipStyles(tag, false)}
              />
            ))}
          </Box>
        </TableCell>
        <TableCell align="right">
          <IconButton
            aria-label="サブタスク追加"
            size="small"
            onClick={() => onAddSubtask(task)}
            color="primary"
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton aria-label="編集" size="small" onClick={() => onEdit(task)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label="削除"
            size="small"
            onClick={() => onDelete(task.id)}
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>

      {/* サブタスク */}
      {hasSubtasks && (
        <TableRow>
          <TableCell style={{ paddingTop: 0, paddingBottom: 0 }} colSpan={7}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1 }}>
                <Table size="small">
                  <TableBody>
                    {task.subtasks.map(subtask => (
                      <TaskRow
                        key={subtask.id}
                        task={subtask}
                        level={level + 1}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onAddSubtask={onAddSubtask}
                      />
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

// メインのタスクリストコンポーネント
const TaskListWithSubtasks: React.FC<TaskListProps> = ({
  tasks,
  onEdit,
  onDelete,
  onAddSubtask,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  // ページ切り替え
  const handleChangePage = (_: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  // 1ページあたりの行数変更
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    onRowsPerPageChange(parseInt(event.target.value, 10));
  };

  return (
    <Paper elevation={1}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>タイトル</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>優先度</TableCell>
              <TableCell>期限日</TableCell>
              <TableCell>担当者</TableCell>
              <TableCell>タグ</TableCell>
              <TableCell align="right">アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body1" sx={{ py: 2 }}>
                    タスクが見つかりません
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              tasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  level={0}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddSubtask={onAddSubtask}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="表示件数:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
      />
    </Paper>
  );
};

export default TaskListWithSubtasks;
