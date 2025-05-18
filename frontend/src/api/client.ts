import axios, { AxiosError, AxiosRequestHeaders, AxiosHeaderValue } from 'axios';

import { NotificationType } from '../contexts/NotificationContext';

// グローバル通知ハンドラー
type NotificationHandler = (message: string, type: NotificationType, duration?: number) => void;
let globalNotificationHandler: NotificationHandler | null = null;

// 通知ハンドラーを設定
export const setGlobalNotificationHandler = (handler: NotificationHandler) => {
  globalNotificationHandler = handler;
};

// CSP責任やXSS対策のため、ローカルストレージからの読み込みを許可しない
// メモリ内でアクセストークンを管理
let accessToken: string | null = null;

// アクセストークンを設定する関数
export const setAccessToken = (token: string | null) => {
  accessToken = token;

  // トークン設定をログからそのまま表示しない
  console.log(`アクセストークンが${token ? '設定されました' : 'クリアされました'}`);
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

// APIベースURLを環境変数から取得
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// 開発時のAPI URLログ出力
console.log(`Using API base URL: ${API_BASE_URL}`);

// APIクライアントのベースインスタンス
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // リクエストにCookieを含める（リフレッシュトークン用）
});

interface ApiResponseError {
  message?: string;
  detail?: string;
}

// リクエストインターセプター
apiClient.interceptors.request.use(
  config => {
    // セキュリティ対策を追加

    // リクエスト前にアクセストークンをヘッダーに設定
    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // CSRF対策：フォームデータを送信する場合は状態を確認
    if (
      (config.method === 'post' || config.method === 'put' || config.method === 'delete') &&
      config.headers && 
      config.headers['Content-Type'] === 'application/x-www-form-urlencoded'
    ) {
      // CSRF対策としてヘッダーにリファラー情報を追加
      // これによりサーバー側でリファラーチェックが可能に
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    // デバッグ用のログ出力（センシティブな情報は隠蔽）
    if (import.meta.env.DEV) {
      const debugConfig = { ...config };
      // セキュリティのため、機密ヘッダーをログに表示しない
      if (debugConfig.headers && 'Authorization' in debugConfig.headers) {
        // Safely clone headers without modifying the original
        const sanitizedHeaders = { ...debugConfig.headers };
        if (sanitizedHeaders.Authorization) {
          sanitizedHeaders.Authorization = '******';
        }
        console.log(`API リクエスト: ${config.method?.toUpperCase()} ${config.url}`);
      }
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// エラーメッセージをユーザーフレンドリーに変換
const getErrorMessage = (error: AxiosError<ApiResponseError>): string => {
  // APIからのエラーメッセージがある場合
  const apiErrorMessage = error.response?.data?.message || error.response?.data?.detail;
  if (apiErrorMessage) return apiErrorMessage;

  // ステータスコードに基づいたメッセージ
  switch (error.response?.status) {
    case 400:
      return 'リクエストが不正です';
    case 401:
      return '認証に失敗しました';
    case 403:
      return 'この操作を行う権限がありません';
    case 404:
      return '指定したリソースが見つかりません';
    case 422:
      return '入力データの検証に失敗しました';
    case 429:
      return 'リクエストが多すぎます。しばらく待ってから再試行してください';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'サーバーエラーが発生しました。しばらくしてから再試行してください';
    default:
      return 'エラーが発生しました';
  }
};

// レスポンスインターセプター
apiClient.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    // 元のリクエストを保存
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // エラーログ（デバッグ用）
    console.error(`API エラー: ${error.response?.status} ${originalRequest.url}`, error);

    // ユーザーへの通知（401エラーでリフレッシュトークン周りのリクエストは除外）
    if (
      error.response &&
      !(
        error.response.status === 401 &&
        (originalRequest.url?.includes('/auth/logout') ||
          originalRequest.url?.includes('/auth/refresh') ||
          originalRequest.url?.includes('/auth/session-check'))
      )
    ) {
      const errorMessage = getErrorMessage(error);
      if (globalNotificationHandler) {
        // 認証エラーの場合は自動消去しない（ログアウト処理が必要なため）
        const duration = error.response.status === 401 ? undefined : 5000;
        globalNotificationHandler(errorMessage, 'error', duration);
      }
    }

    // 401エラーで、かつリトライフラグがfalseの場合（無限ループ防止）
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/logout') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/session-check')
    ) {
      originalRequest._retry = true;

      // すでにリフレッシュ中なら、リフレッシュが完了するのを待つ
      if (isRefreshing) {
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

      try {
        // リフレッシュAPIを呼び出す
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
          },
        );

        // 新しいアクセストークンを取得して保存
        const newAccessToken = response.data.data.access_token;

        setAccessToken(newAccessToken);

        // 元のリクエストのヘッダーを更新
        if (!originalRequest.headers) {
          originalRequest.headers = {};
        }
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // 保留中のリクエストも新しいトークンで実行
        pendingRequests.forEach(request => {
          if (!request.config.headers) {
            request.config.headers = {};
          }
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
