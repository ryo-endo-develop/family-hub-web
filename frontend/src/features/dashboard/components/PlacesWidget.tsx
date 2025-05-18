import { Place as PlaceIcon } from '@mui/icons-material';
import { Card, CardContent, CardHeader, Chip, Grid, Typography } from '@mui/material';

// ダミーデータ
const dummyPlaces = [
  {
    id: 1,
    name: '科学館',
    description: '屋内・体験型展示・子供向けワークショップあり',
    tags: ['屋内', '雨の日OK', '有料'],
  },
  {
    id: 2,
    name: '市民公園',
    description: '広い芝生広場・遊具あり・水遊び場（夏季のみ）',
    tags: ['屋外', '無料'],
  },
  {
    id: 3,
    name: 'スポッチャ',
    description: '室内スポーツ施設・ボウリング・アスレチック',
    tags: ['屋内', '雨の日OK', '有料'],
  },
];

// Props aren't used yet, so removed the interface

const PlacesWidget = () => {
  return (
    <Card>
      <CardHeader title="お出かけスポット" action={<PlaceIcon />} />
      <CardContent>
        <Grid container spacing={2}>
          {dummyPlaces.map(place => (
            <Grid item xs={12} key={place.id}>
              <Card variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="body1" fontWeight="medium">
                  {place.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {place.description}
                </Typography>
                <Grid container spacing={0.5}>
                  {place.tags.map((tag, index) => (
                    <Grid item key={index}>
                      <Chip
                        label={tag}
                        size="small"
                        color={
                          tag === '屋内' || tag === '雨の日OK'
                            ? 'primary'
                            : tag === '無料'
                              ? 'success'
                              : 'default'
                        }
                        variant="outlined"
                      />
                    </Grid>
                  ))}
                </Grid>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default PlacesWidget;
