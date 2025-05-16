import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Reducerを直接import
import authReducer from '../features/auth/authSlice';

// Redux Persistの設定
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'] // 永続化したいステートのキー
};

const rootReducer = combineReducers({
  auth: authReducer,
  // ここに他のリデューサーを追加
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Redux Persistとの互換性のために一部のシリアライズチェックを無効化
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'auth/login/rejected'],
        ignoredPaths: ['auth.error'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
