import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Typography,
  Avatar,
  IconButton,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Person as PersonIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { setCurrentFamily } from '../auth/authSlice';
import apiClient from '../../api/client';

interface Family {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface FamilyMember {
  id: string;
  user_id: string;
  family_id: string;
  role: string;
  is_admin: boolean;
  joined_at: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

const FamilyPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentFamily } = useAppSelector(state => state.auth);

  const [families, setFamilies] = useState<Family[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 家族一覧を取得
  const fetchFamilies = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/families');
      setFamilies(response.data.data);
    } catch (err: any) {
      setError('家族情報の取得に失敗しました');
      console.error('家族情報取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  // 家族メンバー一覧を取得
  const fetchFamilyMembers = async (familyId: string) => {
    if (!familyId) return;

    setMembersLoading(true);

    try {
      const response = await apiClient.get(`/families/${familyId}/members`);
      setFamilyMembers(response.data.data);
    } catch (err: any) {
      console.error('家族メンバー取得エラー:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  // 初期データ取得
  useEffect(() => {
    fetchFamilies();
  }, []);

  // 現在選択されている家族のメンバーを取得
  useEffect(() => {
    const familyId = currentFamily?.id;
    if (familyId) {
      fetchFamilyMembers(familyId);
    }
  }, [currentFamily?.id]);

  // 家族選択ハンドラ
  const handleSelectFamily = async (family: Family) => {
    await dispatch(setCurrentFamily({ id: family.id, name: family.name }));
    navigate('/dashboard');
  };

  // 役割の表示名を取得
  const getRoleName = (role: string) => {
    switch (role) {
      case 'parent':
        return '親';
      case 'child':
        return '子';
      case 'other':
        return 'その他';
      default:
        return role;
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        家族管理
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
        {/* 家族一覧 */}
        <Card sx={{ flex: 1, p: 2, mb: { xs: 3, md: 0 } }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6">家族一覧</Typography>
            <Button variant="contained" size="small" startIcon={<AddIcon />}>
              新規家族
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : families.length === 0 ? (
            <Alert severity="info">
              家族情報がありません。「新規家族」ボタンから家族を作成してください。
            </Alert>
          ) : (
            <List>
              {families.map(family => (
                <ListItem
                  key={family.id}
                  button
                  selected={family.id === currentFamily?.id}
                  onClick={() => handleSelectFamily(family)}
                >
                  <ListItemText
                    primary={family.name}
                    secondary={`作成日: ${new Date(family.created_at).toLocaleDateString()}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Card>

        {/* 家族メンバー一覧 */}
        <Card sx={{ flex: 1, p: 2 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6">
              {currentFamily?.name ? `${currentFamily.name}のメンバー` : 'メンバー一覧'}
            </Typography>
            {currentFamily?.id && (
              <Button variant="outlined" size="small" startIcon={<AddIcon />}>
                メンバー追加
              </Button>
            )}
          </Box>

          {!currentFamily?.id ? (
            <Alert severity="info">左側の一覧から家族を選択してください。</Alert>
          ) : membersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : familyMembers.length === 0 ? (
            <Alert severity="warning">
              メンバーが見つかりません。「メンバー追加」ボタンからメンバーを追加してください。
            </Alert>
          ) : (
            <List>
              {familyMembers.map(member => (
                <ListItem key={member.id}>
                  <ListItemAvatar>
                    <Avatar src={member.user.avatar_url}>
                      {!member.user.avatar_url && <PersonIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${member.user.last_name} ${member.user.first_name}`}
                    secondary={`${getRoleName(member.role)}${member.is_admin ? ' (管理者)' : ''}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Card>
      </Box>
    </Container>
  );
};

export default FamilyPage;
