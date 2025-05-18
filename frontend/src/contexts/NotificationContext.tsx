import React, { createContext, useReducer, useContext, ReactNode } from 'react';

// 通知のタイプ
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

// 通知の形状
export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  duration?: number; // ミリ秒単位（デフォルトは表示され続ける）
}

// コンテキストの状態
interface NotificationState {
  notifications: Notification[];
}

// アクションタイプ
type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: { id: number } };

// 初期状態
const initialState: NotificationState = {
  notifications: [],
};

// コンテキスト作成
const NotificationContext = createContext<{
  state: NotificationState;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: number) => void;
} | undefined>(undefined);

// リデューサー
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION': {
      // ブロックスコープを使用して変数を宣言
      const id = Date.now(); // 一意のIDとして現在のタイムスタンプを使用
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            id,
            message: action.payload.message,
            type: action.payload.type,
            duration: action.payload.duration,
          },
        ],
      };
    }
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          (notification) => notification.id !== action.payload.id
        ),
      };
    default:
      return state;
  }
}

// プロバイダーコンポーネント
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // 通知を追加
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now();
    dispatch({ 
      type: 'ADD_NOTIFICATION', 
      payload: notification
    });

    // 自動的に消える設定の場合
    if (notification.duration) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: { id } });
      }, notification.duration);
    }
  };

  // 通知を削除
  const removeNotification = (id: number) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: { id } });
  };

  return (
    <NotificationContext.Provider value={{ state, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

// カスタムフック
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
