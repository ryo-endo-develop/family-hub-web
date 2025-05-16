import { Grid, Typography, CircularProgress, Box, Alert } from '@mui/material';
import { useEffect, useState } from 'react';
import { useAppSelector } from '../../hooks/reduxHooks';

import TaskSummaryWidget from './components/TaskSummaryWidget';
import CalendarWidget from './components/CalendarWidget';
import MenuWidget from './components/MenuWidget';
import PlacesWidget from './components/PlacesWidget';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const { currentFamily } = useAppSelector(state => state.auth);

  useEffect(() => {
    // コンポーネントのマウント時にローディング状態をリセット
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!currentFamily?.id) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          ダッシュボード
        </Typography>
        <Alert severity="warning">
          家族情報が取得できていません。所属する家族がない場合は、まず家族を作成してください。
        </Alert>
      </Box>
    );
  }

  return (
    <div>
      <Typography variant="h4" component="h1" gutterBottom>
        ダッシュボード
      </Typography>

      <Grid container spacing={3}>
        {/* タスク概要ウィジェット */}
        <Grid item xs={12} md={6}>
          <TaskSummaryWidget familyId={currentFamily.id} />
        </Grid>

        {/* カレンダーウィジェット */}
        <Grid item xs={12} md={6}>
          <CalendarWidget familyId={currentFamily.id} />
        </Grid>

        {/* 献立ウィジェット */}
        <Grid item xs={12} md={6}>
          <MenuWidget familyId={currentFamily.id} />
        </Grid>

        {/* お出かけスポットウィジェット */}
        <Grid item xs={12} md={6}>
          <PlacesWidget familyId={currentFamily.id} />
        </Grid>
      </Grid>
    </div>
  );
};

export default DashboardPage;
