import { RestaurantMenu as MenuIcon } from '@mui/icons-material';
import { Card, CardContent, CardHeader, Divider, Grid, Typography } from '@mui/material';
// prettier-ignore
import { format } from 'date-fns';
// prettier-ignore
import ja from 'date-fns/locale/ja';

// Props aren't used yet, so removed the interface

// ダミーデータ
const dummyMenus = {
  breakfast: 'トースト・スクランブルエッグ',
  lunch: 'サンドイッチ',
  dinner: '鮭のホイル焼き・サラダ',
};

const MenuWidget = () => {
  const today = new Date();
  const formattedDate = format(today, 'M月d日（E）', { locale: ja });

  return (
    <Card>
      <CardHeader title="今日の献立" subheader={formattedDate} action={<MenuIcon />} />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              朝食
            </Typography>
            <Typography variant="body1" mb={1}>
              {dummyMenus.breakfast}
            </Typography>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              昼食
            </Typography>
            <Typography variant="body1" mb={1}>
              {dummyMenus.lunch}
            </Typography>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              夕食
            </Typography>
            <Typography variant="body1">{dummyMenus.dinner}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default MenuWidget;
