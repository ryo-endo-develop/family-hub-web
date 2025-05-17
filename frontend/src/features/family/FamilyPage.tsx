import { useState, useEffect } from 'react';

import { Add as AddIcon, Person as PersonIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  Avatar,
  Alert,
  IconButton,
  Snackbar,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { useFamilyApi, Family, FamilyMember } from '../../api/hooks/useFamilyApi';
import { useNotification } from '../../contexts/NotificationContext';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { setCurrentFamily } from '../auth/authSlice';

import AddMemberDialog from './components/AddMemberDialog';
import CreateFamilyDialog from './components/CreateFamilyDialog';

const FamilyPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentFamily, user } = useAppSelector(state => state.auth);
  const { addNotification } = useNotification();

  // 家族APIフックを利用
  const { 
    getFamilies, 
    getFamilyMembers, 
    removeFamilyMember,
    loading: apiLoading, 
    error: apiError 
  } = useFamilyApi();

  // 状態管理
  const [families, setFamilies] = useState<Family[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ダイアログの状態
  const [isCreateFamilyDialogOpen, setCreateFamilyDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

  // 家族一覧を取得
  const fetchFamilies = async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedFamilies = await getFamilies();
      if (fetchedFamilies) {
        setFamilies(fetchedFamilies);
      } else if (apiError) {
        setError(apiError);
      }
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
      const fetchedMembers = await getFamilyMembers(familyId);
      if (fetchedMembers) {
        setFamilyMembers(fetchedMembers);
      }
    } catch (err: any) {
      console.error('家族メンバー取得エラー:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  // メンバー削除ハンドラ
  const handleRemoveMember = async (userId: string) => {
    if (!currentFamily?.id) return;

    // 自分自身を削除しようとしている場合は確認が必要
    if (userId === user?.id) {
      const confirmed = window.confirm('自分自身を削除すると、この家族にアクセスできなくなります。よろしいですか？');
      if (!confirmed) return;
    }

    try {
      const success = await removeFamilyMember(currentFamily.id, userId);
      if (success) {
        // メンバー削除成功
        fetchFamilyMembers(currentFamily.id);
        addNotification({
          message: 'メンバーを削除しました',
          type: 'success',
          duration: 3000,
        });
      }
    } catch (err) {
      console.error('メンバー削除エラー:', err);
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

  // 新規家族ダイアログのハンドラ
  const handleCreateFamilyDialogClose = (refresh?: boolean, familyName?: string) => {
    setCreateFamilyDialogOpen(false);
    
    if (refresh) {
      fetchFamilies();
      addNotification({
        message: `家族「${familyName}」を作成しました`,
        type: 'success',
        duration: 3000,
      });
    }
  };

  // メンバー追加ダイアログのハンドラ
  const handleAddMemberDialogClose = (refresh?: boolean, memberEmail?: string) => {
    setAddMemberDialogOpen(false);
    
    if (refresh && currentFamily?.id) {
      fetchFamilyMembers(currentFamily.id);
      addNotification({
        message: `メンバー「${memberEmail}」を追加しました`,
        type: 'success',
        duration: 3000,
      });
    }
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
            <Button 
              variant="contained" 
              size="small" 
              startIcon={<AddIcon />}
              onClick={() => setCreateFamilyDialogOpen(true)}
            >
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
              <Button 
                variant="outlined" 
                size="small" 
                startIcon={<AddIcon />}
                onClick={() => setAddMemberDialogOpen(true)}
              >
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
                <ListItem key={member.id} 
                  secondaryAction={
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => handleRemoveMember(member.user_id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
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

      {/* 新規家族作成ダイアログ */}
      <CreateFamilyDialog 
        open={isCreateFamilyDialogOpen} 
        onClose={handleCreateFamilyDialogClose} 
      />

      {/* メンバー追加ダイアログ */}
      {currentFamily?.id && (
        <AddMemberDialog 
          open={isAddMemberDialogOpen} 
          familyId={currentFamily.id}
          onClose={handleAddMemberDialogClose} 
        />
      )}
    </Container>
  );
};

export default FamilyPage;
