import {
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreHoriz as MoreHorizIcon,
  PriorityHigh as PriorityHighIcon,
  Add as AddIcon,
  Event as EventIcon,
  Person as PersonIcon,
  LocalOffer as TagIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Chip,
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
  useMediaQuery,
  useTheme,
  Stack,
} from '@mui/material';
import { format } from 'date-fns';
import { getTagChipStyles } from '../../../utils/tagUtils';
import ja from 'date-fns/locale/ja';

import { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask?: (task: Task) => void; // サブタスク追加ハンドラ (オプショナル)
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

const TaskList = ({
  tasks,
  onEdit,
  onDelete,
  onAddSubtask,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: TaskListProps) => {
  // レスポンシブ対応のためのフック
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // ステータスに応じた表示を返す
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

  // 優先度に応じた表示を返す
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
  const getDueDateDisplay = (dueDate: string | Date | null) => {
    if (!dueDate) return '-';

    try {
      // 文字列またはDate型に対応
      const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
      return format(date, 'yyyy/MM/dd', { locale: ja });
    } catch (error) {
      console.error('日付のフォーマットに失敗:', error, dueDate);
      return '-';
    }
  };

  // ページ切り替え
  const handleChangePage = (_: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  // 1ページあたりの行数変更
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    onRowsPerPageChange(parseInt(event.target.value, 10));
  };

  // タスク一覧を表示（モバイル用）
  const renderMobileTaskList = () => (
    <Stack spacing={2}>
      {tasks.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1">タスクが見つかりません</Typography>
          </CardContent>
        </Card>
      ) : (
        tasks.map(task => (
          <Card key={task.id} sx={{ position: 'relative' }}>
            <CardContent sx={{ pb: 0 }}>
              {/* タイトルと特殊タイプバッジ */}
              <Typography variant="h6" component="div" gutterBottom>
                {task.title}
                {task.is_routine && (
                  <Chip
                    label="ルーティン"
                    size="small"
                    color="secondary"
                    sx={{ ml: 1, verticalAlign: 'middle' }}
                  />
                )}
                {task.parent_id && (
                  <Chip
                    label="サブタスク"
                    size="small"
                    color="info"
                    sx={{ ml: 1, verticalAlign: 'middle' }}
                  />
                )}
              </Typography>

              {/* ステータスと優先度 */}
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                {getStatusDisplay(task.status)}
                {getPriorityDisplay(task.priority)}
              </Stack>

              {/* 期限日 */}
              {task.due_date && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <EventIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {getDueDateDisplay(task.due_date)}
                  </Typography>
                </Box>
              )}

              {/* 担当者 */}
              {task.assignee && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PersonIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {`${task.assignee.last_name} ${task.assignee.first_name}`}
                  </Typography>
                </Box>
              )}

              {/* タグ一覧 */}
              {task.tags.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <TagIcon fontSize="small" color="action" sx={{ mr: 1, mt: 0.5 }} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {task.tags.map(tag => (
                      <Chip
                        key={tag.id}
                        label={tag.name}
                        size="small"
                        sx={{
                          ...getTagChipStyles(tag, false),
                          height: 20,
                          fontSize: '0.7rem',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>

            {/* アクションボタン */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
              {onAddSubtask && (
                <IconButton
                  aria-label="サブタスク追加"
                  size="small"
                  onClick={() => onAddSubtask(task)}
                  color="primary"
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              )}
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
            </Box>
          </Card>
        ))
      )}
    </Stack>
  );

  // タスク一覧を表示（デスクトップ用）
  const renderDesktopTaskList = () => (
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
              <TableRow key={task.id} hover>
                <TableCell component="th" scope="row">
                  <Typography variant="body1">{task.title}</Typography>
                  {task.is_routine && (
                    <Chip label="ルーティン" size="small" color="secondary" sx={{ ml: 1 }} />
                  )}
                  {task.parent_id && (
                    <Chip label="サブタスク" size="small" color="info" sx={{ ml: 1 }} />
                  )}
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
                  {onAddSubtask && (
                    <IconButton
                      aria-label="サブタスク追加"
                      size="small"
                      onClick={() => onAddSubtask(task)}
                      color="primary"
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  )}
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
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Paper elevation={1}>
      {/* デバイスサイズに応じてビューを切り替え */}
      {isMobile ? renderMobileTaskList() : renderDesktopTaskList()}

      {/* ページネーション */}
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

export default TaskList;
