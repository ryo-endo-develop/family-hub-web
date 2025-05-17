import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import apiClient, { checkAuthStatus, setAccessToken } from '../../api/client';

// 型定義
export interface FamilyMembership {
  id: string;
  family_id: string;
  role: string;
  is_admin: boolean;
  joined_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  family_memberships?: FamilyMembership[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

// 認証状態の型
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  currentFamily: {
    id: string | null;
    name: string | null;
  };
}

// 初期状態
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  currentFamily: {
    id: null,
    name: null,
  },
};

// アプリ初期化時の認証状態確認
// 重複実行防止フラグ
let isCheckingAuth = false;

// アプリ起動時に認証状態を確認
export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { rejectWithValue }) => {
  try {
    // 重複実行防止
    if (isCheckingAuth) {
      return rejectWithValue('すでに認証確認中です');
    }
    isCheckingAuth = true;

    // 認証状態を確認
    const isAuthenticated = await checkAuthStatus();

    // 認証されていない場合は早期リターン
    if (!isAuthenticated) {
      isCheckingAuth = false;
      return rejectWithValue('認証されていません');
    }

    // ユーザー情報を取得
    const userResponse = await apiClient.get('/users/me');
    const user = userResponse.data.data;

    // 家族情報を取得
    let currentFamilyId = null;
    let currentFamilyName = null;

    try {
      const familiesResponse = await apiClient.get('/families');
      const families = familiesResponse.data.data;

      // 最初の家族をデフォルトとして使用
      if (families && families.length > 0) {
        currentFamilyId = families[0].id;
        currentFamilyName = families[0].name;
      }
    } catch (err) {
      console.error('家族情報の取得に失敗しました:', err);
    }

    isCheckingAuth = false;
    return {
      user,
      currentFamily: {
        id: currentFamilyId,
        name: currentFamilyName,
      },
    };
  } catch (error) {
    isCheckingAuth = false;
    return rejectWithValue('認証に失敗しました');
  }
});

// 非同期アクション
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      // FastAPIはOAuth2を使用するのでフォームデータに変換
      const formData = new URLSearchParams();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      const response = await apiClient.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // アクセストークンの取得
      const { access_token } = response.data.data;

      // アクセストークンをメモリに設定
      setAccessToken(access_token);

      // ユーザー情報を取得
      const userResponse = await apiClient.get('/users/me');
      const user = userResponse.data.data;

      // ユーザーの家族情報を取得
      let currentFamilyId = null;
      let currentFamilyName = null;

      try {
        const familiesResponse = await apiClient.get('/families');
        const families = familiesResponse.data.data;

        // 最初の家族をデフォルトとして使用
        if (families && families.length > 0) {
          currentFamilyId = families[0].id;
          currentFamilyName = families[0].name;
        }
      } catch (err) {
        console.error('家族情報の取得に失敗しました:', err);
      }

      return {
        user,
        currentFamily: {
          id: currentFamilyId,
          name: currentFamilyName,
        },
      };
    } catch (error: any) {
      console.error('ログインエラー:', error);
      let message = 'ログインに失敗しました';
      if (error.response && error.response.data && error.response.data.detail) {
        message = error.response.data.detail;
      }
      return rejectWithValue(message);
    }
  },
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data.data;
    } catch (error: any) {
      let message = '登録に失敗しました';
      if (error.response && error.response.data && error.response.data.detail) {
        message = error.response.data.detail;
      }
      return rejectWithValue(message);
    }
  },
);

export const logout = createAsyncThunk('auth/logoutAction', async (_, { dispatch }) => {
  try {
    // サーバーにログアウトリクエストを送信
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.error('ログアウトAPI呼び出しエラー:', error);
    // エラーが発生しても継続する
  } finally {
    // ログアウト処理（ローカルのみ）を実行
    dispatch(logoutLocal());
    // アクセストークンをクリア
    setAccessToken(null);
  }
});

// 現在の家族を設定するアクション
export const setCurrentFamily = createAsyncThunk(
  'auth/setCurrentFamily',
  async ({ id, name }: { id: string; name: string }) => {
    return { id, name };
  },
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // ローカルのログアウト処理（状態のクリアのみ）
    logoutLocal: state => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.currentFamily = {
        id: null,
        name: null,
      };
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // Login
    builder.addCase(login.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      login.fulfilled,
      (
        state,
        action: PayloadAction<{
          user: User;
          currentFamily: { id: string | null; name: string | null };
        }>,
      ) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.currentFamily = action.payload.currentFamily;
      },
    );
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Register
    builder.addCase(register.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, state => {
      state.loading = false;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Check Auth
    builder.addCase(checkAuth.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      checkAuth.fulfilled,
      (
        state,
        action: PayloadAction<{
          user: User;
          currentFamily: { id: string | null; name: string | null };
        }>,
      ) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.currentFamily = action.payload.currentFamily;
      },
    );
    builder.addCase(checkAuth.rejected, (state, action) => {
      state.loading = false;
      // 既に認証状態を確認中の場合はエラーメッセージのみをクリア
      if (action.payload === 'すでに認証確認中です') {
        state.error = null;
      } else {
        // 認証されていない場合は認証状態をクリア
        state.isAuthenticated = false;
        state.user = null;
        state.currentFamily = {
          id: null,
          name: null,
        };
      }
    });

    // Logout
    builder.addCase(logout.pending, state => {
      state.loading = true;
    });
    builder.addCase(logout.fulfilled, state => {
      state.loading = false;
      // ※ 実際のログアウト処理はlogoutLocalアクションで行われる
    });
    builder.addCase(logout.rejected, state => {
      state.loading = false;
      // エラーが発生しても状態はクリアする
    });

    // Set Current Family
    builder.addCase(
      setCurrentFamily.fulfilled,
      (state, action: PayloadAction<{ id: string; name: string }>) => {
        state.currentFamily = action.payload;
      },
    );
  },
});

export const { logoutLocal, clearError } = authSlice.actions;

export default authSlice.reducer;
