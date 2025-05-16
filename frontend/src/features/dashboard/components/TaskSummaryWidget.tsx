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
import { Assignment as AssignmentIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useTaskApi } from '../../../api/hooks/useTaskApi';

interface TaskSummaryWidgetProps {
  familyId: string;
}

const TaskSummaryWidget = ({ familyId }: TaskSummaryWidgetProps) => {
  const { getTasks, loading, error } = useTaskApi();
  const [tasks, setTasks] = useState([]);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    const fetchTasks = async () => {
      const response = await getTasks(familyId);
      if (response) {
        setTasks(response.tasks);
        setTaskCount(response.total);
      }
    };
    fetchTasks();
  }, [familyId, getTasks]);

  if (loading) {
    return (
      <Card>
        <CardContent>読み込み中...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>エラーが発生しました</CardContent>
      </Card>
    );
  }

  // タスクの完了状態を切り替え
  const toggleTaskComplete = (id: number) => {
    setTasks(tasks.map(task => (task.id === id ? { ...task, completed: !task.completed } : task)));
  };

  // 未完了タスクの数を取得
  const pendingTasksCount = tasks.filter(task => !task.completed).length;

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
                <ListItemButton onClick={() => toggleTaskComplete(task.id)} dense>
                  <ListItemIcon>
                    <Checkbox edge="start" checked={task.completed} disableRipple />
                  </ListItemIcon>
                  <ListItemText
                    primary={task.title}
                    primaryTypographyProps={{
                      style: task.completed
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
