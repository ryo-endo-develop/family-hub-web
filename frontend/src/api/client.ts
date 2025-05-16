import axios from 'axios';

// メモリ内でアクセストークンを管理
let accessToken: string | null = null;

// アクセストークンを設定する関数
export const setAccessToken = (token: string | null) => {
  accessToken = token;

  // ログ出力（デバッグ用）
  console.log(`アクセストークンを設定: ${token ? '有効' : '無効'}`);
};

// アクセストークンを取得する関数
export const getAccessToken = (): string | null => {
  return accessToken;
};

// リフレッシュ処理中かどうかのフラグ
let isRefreshing = false;
// リフレッシュ待ちのリクエスト
let pendingRequests: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
  config: any;
}> = [];

// APIクライアントのベースインスタンス
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // リクエストにCookieを含める（リフレッシュトークン用）
});

// リクエストインターセプター
apiClient.interceptors.request.use(
  config => {
    // リクエスト前にアクセストークンをヘッダーに設定
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // リクエストログ（デバッグ用）
    console.log(`API リクエスト: ${config.method?.toUpperCase()} ${config.url}`);

    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// レスポンスインターセプター
apiClient.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    // 元のリクエストを保存
    const originalRequest = error.config;

    // エラーログ（デバッグ用）
    console.error(`API エラー: ${error.response?.status} ${originalRequest.url}`);

    // 401エラーで、かつリトライフラグがfalseの場合（無限ループ防止）
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/logout') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/session-check')
    ) {
      originalRequest._retry = true;

      console.log('トークンの更新を試みます');

      // すでにリフレッシュ中なら、リフレッシュが完了するのを待つ
      if (isRefreshing) {
        console.log('既にリフレッシュ処理中なので待機します');
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve,
            reject,
            config: originalRequest,
          });
        });
      }

      // リフレッシュを開始
      isRefreshing = true;
      console.log('リフレッシュ処理を開始します');

      try {
        // リフレッシュAPIを呼び出す
        const response = await axios.post(
          '/api/v1/auth/refresh',
          {},
          {
            withCredentials: true,
          },
        );

        // 新しいアクセストークンを取得して保存
        const newAccessToken = response.data.data.access_token;

        console.log('新しいアクセストークンを取得しました');
        setAccessToken(newAccessToken);

        // 元のリクエストのヘッダーを更新
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // 保留中のリクエストも新しいトークンで実行
        console.log(`保留中のリクエスト数: ${pendingRequests.length}`);
        pendingRequests.forEach(request => {
          request.config.headers.Authorization = `Bearer ${newAccessToken}`;
          apiClient(request.config)
            .then(res => request.resolve(res))
            .catch(err => request.reject(err));
        });
        pendingRequests = [];

        // 元のリクエストを再実行
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('トークンの更新に失敗しました', refreshError);

        // 保留中のリクエストを全てリジェクト
        pendingRequests.forEach(request => {
          request.reject(refreshError);
        });
        pendingRequests = [];

        // トークンをクリア
        setAccessToken(null);

        // ログアウトハンドラーを呼び出す
        console.log('認証エラーによりログアウト処理を実行します');
        logoutHandlers.forEach(handler => handler());

        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ログアウトハンドラーの登録（複数可）
const logoutHandlers: (() => void)[] = [];

// ログアウトハンドラーを登録する関数
export const registerLogoutHandler = (handler: () => void) => {
  logoutHandlers.push(handler);
  return () => unregisterLogoutHandler(handler);
};

// ログアウトハンドラーを削除する関数
export const unregisterLogoutHandler = (handler: () => void) => {
  const index = logoutHandlers.indexOf(handler);
  if (index > -1) {
    logoutHandlers.splice(index, 1);
  }
};

// 認証状態を確認する関数
export const checkAuthStatus = async (): Promise<boolean> => {
  try {
    if (!accessToken) {
      return false;
    }

    await apiClient.get('/auth/session-check');
    return true;
  } catch (error) {
    console.error('認証セッションの確認に失敗しました', error);
    return false;
  }
};

export default apiClient;
