import { useState, useEffect } from 'react';

import { Assignment as AssignmentIcon } from '@mui/icons-material';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';

import { useTaskApi } from '../../../api/hooks/useTaskApi';
import { useNotification } from '../../../contexts/NotificationContext';
import { Task } from '../../tasks/types';

interface TaskSummaryWidgetProps {
  familyId: string;
}

const TaskSummaryWidget = ({ familyId }: TaskSummaryWidgetProps) => {
  const { getTasks, updateTask, loading, error } = useTaskApi();
  const { addNotification } = useNotification();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(new Set());

  // タスク一覧を取得
  useEffect(() => {
    const fetchTasks = async () => {
      if (!familyId) return;
      
      try {
        const response = await getTasks(familyId);
        if (response) {
          setTasks(response.tasks);
          setTaskCount(response.total);
        }
      } catch (err) {
        // エラーはAPI clientが共通処理するので、ここでは特に何もしない
        console.error('タスク取得中にエラーが発生しました:', err);
      }
    };
    
    fetchTasks();
  }, [familyId, getTasks]);

  // APIエラーがあればエラー通知を表示
  useEffect(() => {
    if (error) {
      addNotification({
        message: `タスクの読み込みに失敗しました: ${error}`,
        type: 'error',
        duration: 5000
      });
    }
  }, [error, addNotification]);

  // タスクの完了状態を切り替え
  const toggleTaskComplete = async (task: Task) => {
    // 更新中なら処理をスキップ
    if (updatingTaskIds.has(task.id)) return;
    
    // 新しい状態を定義
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const statusText = newStatus === 'completed' ? '完了' : '未完了';
    
    try {
      // 更新中のタスクIDを追加
      setUpdatingTaskIds(prev => new Set(prev).add(task.id));
      
      // 楽観的UI更新（即座にUIを更新）
      setTasks(currentTasks => 
        currentTasks.map(t => 
          t.id === task.id ? { ...t, status: newStatus } : t
        )
      );
      
      // APIを呼び出してバックエンドを更新
      await updateTask(task.id, { status: newStatus });
      
      // 成功通知
      addNotification({
        message: `タスク「${task.title}」を${statusText}に設定しました`,
        type: 'success',
        duration: 3000
      });
    } catch (err) {
      console.error('タスク更新中にエラーが発生しました:', err);
      
      // 失敗した場合は元の状態に戻す
      setTasks(currentTasks => 
        currentTasks.map(t => 
          t.id === task.id ? { ...t, status: task.status } : t
        )
      );
      
      // エラー通知はAPIクライアントの共通処理で表示されるためここでは追加しない
    } finally {
      // 更新中のタスクIDを削除
      setUpdatingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <Card>
        <CardContent>読み込み中...</CardContent>
      </Card>
    );
  }

  // 未完了タスクの数を取得
  const pendingTasksCount = tasks.filter(task => task.status !== 'completed').length;

  return (
    <Card>
      <CardHeader
        title="今日のタスク"
        subheader={`${pendingTasksCount}件の未完了タスク`}
        action={
          <Badge badgeContent={pendingTasksCount} color="primary" showZero>
            <AssignmentIcon />
          </Badge>
        }
      />
      <CardContent>
        {tasks.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center">
            タスクはありません
          </Typography>
        ) : (
          <List disablePadding>
            {tasks.map(task => (
              <ListItem key={task.id} disablePadding>
                <ListItemButton 
                  onClick={() => toggleTaskComplete(task)} 
                  dense
                  disabled={updatingTaskIds.has(task.id)}
                >
                  <ListItemIcon>
                    <Checkbox 
                      edge="start" 
                      checked={task.status === 'completed'} 
                      disableRipple 
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={task.title}
                    primaryTypographyProps={{
                      style: task.status === 'completed'
                        ? { textDecoration: 'line-through', color: 'gray' }
                        : {},
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskSummaryWidget;
