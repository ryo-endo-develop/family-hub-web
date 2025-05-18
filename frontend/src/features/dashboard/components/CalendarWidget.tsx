import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { Card, CardContent, CardHeader, Grid, Typography } from '@mui/material';
// prettier-ignore
import { format, isSameDay } from 'date-fns';
// prettier-ignore
import ja from 'date-fns/locale/ja';

// ダミーデータ
const dummyEvents = [
  { id: 1, title: '保育園 父母会', date: new Date(2025, 4, 5) },
  { id: 2, title: '公園ピクニック', date: new Date(2025, 4, 10) },
  { id: 3, title: '予防接種', date: new Date(2025, 4, 15) },
];

interface CalendarWidgetProps {
  familyId: string;
}

const CalendarWidget = ({ familyId }: CalendarWidgetProps) => {
  const today = new Date();

  // 今日のイベントをフィルタリング
  const todayEvents = dummyEvents.filter(event => isSameDay(event.date, today));

  // 今週のイベントをフィルタリング（今日を除く）
  const upcomingEvents = dummyEvents.filter(
    event =>
      event.date > today && event.date <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
  );

  return (
    <Card>
      <CardHeader title="予定" action={<CalendarIcon />} />
      <CardContent>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          今日の予定
        </Typography>

        {todayEvents.length === 0 ? (
          <Typography variant="body2" color="text.secondary" mb={2}>
            今日の予定はありません
          </Typography>
        ) : (
          <Grid container spacing={1} mb={2}>
            {todayEvents.map(event => (
              <Grid item xs={12} key={event.id}>
                <Card
                  variant="outlined"
                  sx={{
                    bgcolor: 'primary.50',
                    border: '1px solid',
                    borderColor: 'primary.200',
                    p: 1.5,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {format(event.date, 'HH:mm', { locale: ja })}
                  </Typography>
                  <Typography variant="body1">{event.title}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          今後の予定
        </Typography>

        {upcomingEvents.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            予定はありません
          </Typography>
        ) : (
          <Grid container spacing={1}>
            {upcomingEvents.map(event => (
              <Grid item xs={12} key={event.id}>
                <Card variant="outlined" sx={{ bgcolor: 'grey.50', p: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {format(event.date, 'M月d日（E）', { locale: ja })}
                  </Typography>
                  <Typography variant="body1">{event.title}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarWidget;
