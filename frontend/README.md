# SyncFam - 家族向けハブアプリケーション フロントエンド

SyncFam は、家族向けのタスク管理・スケジュール調整・献立管理・お出かけスポット記録などの機能を提供するハブアプリケーションです。このリポジトリはフロントエンド実装です。

## 目次

- [クイックスタート](#クイックスタート)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [アプリケーション構造](#アプリケーション構造)
- [機能概要](#機能概要)
- [開発者ガイド](#開発者ガイド)
- [コード品質管理](#コード品質管理)

## クイックスタート

```bash
# リポジトリをクローン
git clone https://github.com/your-username/family-hub-web.git
cd family-hub-web/frontend

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev

# ブラウザでアプリを開く
# http://localhost:3000
```

## 開発環境のセットアップ

### 前提条件

- Node.js 16.x 以上
- npm 7.x 以上

### 環境構築手順

1. リポジトリをクローン:

```bash
git clone https://github.com/your-username/family-hub-web.git
cd family-hub-web/frontend
```

2. 依存関係をインストール:

```bash
npm install
```

3. 開発サーバーを起動:

```bash
npm run dev
```

これで開発サーバーが起動し、通常は http://localhost:3000 でアプリケーションにアクセスできます。

### バックエンドとの接続

フロントエンドはバックエンドAPIと通信する必要があります。開発モードでは、Viteの設定により `/api` へのリクエストは自動的にバックエンドサーバー（通常 http://localhost:8000）にプロキシされます。

バックエンドの設定方法については、[バックエンドのREADME](../backend/README.md)を参照してください。

## アプリケーション構造

```
frontend/
├── public/            # 静的ファイル
├── src/
│   ├── api/           # API関連
│   │   ├── client.ts  # Axiosベースクライアント
│   │   └── hooks/     # APIカスタムフック
│   ├── app/           # アプリケーション設定
│   │   ├── store.ts   # Reduxストア
│   │   └── router.tsx # ルーティング設定
│   ├── components/    # 共通コンポーネント
│   ├── contexts/      # Reactコンテキスト
│   ├── features/      # 機能モジュール
│   │   ├── auth/      # 認証関連
│   │   ├── tasks/     # タスク管理
│   │   ├── dashboard/ # ダッシュボード
│   │   └── family/    # 家族管理
│   ├── hooks/         # 共通カスタムフック
│   ├── layouts/       # レイアウトコンポーネント
│   ├── styles/        # グローバルスタイル
│   ├── types/         # 型定義
│   ├── utils/         # ユーティリティ関数
│   ├── App.tsx        # アプリルート
│   ├── main.tsx       # エントリーポイント
│   └── vite-env.d.ts  # Vite環境変数型定義
├── .eslintrc.cjs      # ESLint設定
├── .prettierrc        # Prettier設定
├── index.html         # HTMLテンプレート
├── package.json       # 依存関係
├── tailwind.config.js # Tailwind設定
├── tsconfig.json      # TypeScript設定
└── vite.config.ts     # Vite設定
```

## デモアカウントの使用方法

バックエンドでデモデータをセットアップすると、以下のユーザーアカウントが使用可能になります：

- **田中太郎**: dad@example.com / password123
- **田中花子**: mom@example.com / password123
- **佐藤一郎**: grandpa@example.com / password123

## 機能概要

### 認証機能

- ユーザー登録
- ログイン/ログアウト
- 認証状態の維持（リフレッシュトークン）

### タスク管理

- タスクの一覧表示（フラットビューとツリービュー）
- タスクの作成、編集、削除
- サブタスクの作成と管理
- ステータス、優先度、期限などでのフィルタリング
- タグによる分類

### 家族管理

- 家族の表示と切り替え
- 家族メンバーの表示

### ダッシュボード

- 今日のタスク概要
- カレンダー予定表示（ウィジェット）
- 献立表示（ウィジェット）
- お出かけスポット表示（ウィジェット）

## 開発者ガイド

### APIクライアントの使い方

#### 基本的な使用方法

APIクライアントはAxiosベースで実装されており、各機能ごとにカスタムフックが用意されています。

```typescript
// タスク関連のAPIフックを使う例
import { useTaskApi } from '../api/hooks/useTaskApi';

const MyComponent = () => {
  const { getTasks, createTask, updateTask, deleteTask, loading, error } = useTaskApi();
  
  // タスク一覧の取得
  useEffect(() => {
    const fetchTasks = async () => {
      const response = await getTasks(familyId);
      if (response) {
        setTasks(response.tasks);
      }
    };
    
    fetchTasks();
  }, [familyId, getTasks]);
  
  // タスクの作成
  const handleCreateTask = async (taskData) => {
    const result = await createTask(taskData);
    if (result) {
      // 成功時の処理
    }
  };
  
  // 以下省略...
};
```

#### 認証トークンの自動管理

APIクライアントは認証トークンを自動的に管理します：

- ログイン時にトークンを保存
- リクエスト時にトークンを自動的にヘッダーに付与
- トークンの有効期限切れ時に自動的にリフレッシュ
- 認証エラー時に自動的にログアウト

### フォーム管理

React Hook FormとZodを使用したフォーム実装例：

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// バリデーションスキーマ
const taskSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  due_date: z.date().nullable().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  is_routine: z.boolean().default(false),
  family_id: z.string().uuid(),
  assignee_id: z.string().uuid().nullable().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

// フォームの型定義
type TaskFormInputs = z.infer<typeof taskSchema>;

const TaskForm = ({ onSubmit, initialData, familyId }) => {
  const { register, handleSubmit, control, formState: { errors } } = useForm<TaskFormInputs>({
    resolver: zodResolver(taskSchema),
    defaultValues: initialData || {
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      is_routine: false,
      family_id: familyId,
      assignee_id: null,
      tag_ids: [],
    },
  });
  
  const onFormSubmit = async (data: TaskFormInputs) => {
    await onSubmit(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      {/* フォームフィールド */}
    </form>
  );
};
```

### 通知システムの使い方

グローバル通知システムを使用して、操作結果をユーザーに通知することができます：

```typescript
import { useNotification } from '../contexts/NotificationContext';

const MyComponent = () => {
  const { addNotification } = useNotification();
  
  const handleSuccess = () => {
    addNotification({
      message: 'タスクを作成しました',
      type: 'success',
      duration: 3000
    });
  };
  
  const handleError = (error) => {
    addNotification({
      message: `エラーが発生しました: ${error}`,
      type: 'error',
      duration: 5000
    });
  };
  
  return (
    // コンポーネントの内容
  );
};
```

### Reduxストアの利用

Reduxストアを使用して状態を管理する例：

```typescript
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks';
import { login, logout } from '../features/auth/authSlice';

const AuthComponent = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading, error } = useAppSelector(state => state.auth);
  
  const handleLogin = async (credentials) => {
    await dispatch(login(credentials));
  };
  
  const handleLogout = () => {
    dispatch(logout());
  };
  
  return (
    // コンポーネントの内容
  );
};
```

## コンポーネント開発

### 新しいコンポーネントのテンプレート

新しいコンポーネントを作成する際のテンプレート例：

```typescript
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

interface MyComponentProps {
  title: string;
  data?: any[];
  onAction?: (id: string) => void;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, data = [], onAction }) => {
  const [state, setState] = useState<any>(null);
  
  useEffect(() => {
    // 初期化ロジック
  }, []);
  
  const handleClick = (id: string) => {
    if (onAction) {
      onAction(id);
    }
  };
  
  return (
    <Box>
      <Typography variant="h6">{title}</Typography>
      {data.map(item => (
        <div key={item.id} onClick={() => handleClick(item.id)}>
          {item.name}
        </div>
      ))}
    </Box>
  );
};

export default MyComponent;
```

### MUIとTailwindの併用例

Material-UIコンポーネントとTailwindCSSを併用する例：

```tsx
<Box 
  sx={{ p: 2, borderRadius: 2 }}
  className="bg-white shadow-md hover:shadow-lg transition-shadow duration-300"
>
  <Typography 
    variant="h6" 
    className="text-primary-dark font-medium mb-2"
  >
    タイトル
  </Typography>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <TextField 
      label="名前" 
      variant="outlined" 
      fullWidth 
      className="bg-gray-50"
    />
    <Button 
      variant="contained" 
      className="h-12 mt-auto bg-primary-main hover:bg-primary-dark"
    >
      送信
    </Button>
  </div>
</Box>
```

## コード品質管理

### ESLintとPrettierの実行

コードの品質を維持するため、ESLintとPrettierを使用してください：

```bash
# コードのリント
npm run lint

# コードのフォーマット
npm run format
```

### テストの実行

```bash
# すべてのテストを実行
npm run test

# テストの監視モード
npm run test:watch
```

### ビルドとプレビュー

本番ビルドの作成とプレビュー：

```bash
# プロダクションビルドの作成
npm run build

# ビルドのプレビュー
npm run preview
```

## 開発者コマンド一覧

以下は、開発作業で頻繁に使用するコマンドの一覧です：

```bash
# 開発サーバーの起動
npm run dev

# リント実行
npm run lint

# コードフォーマット
npm run format

# テスト実行
npm run test

# ビルド
npm run build

# ビルドプレビュー
npm run preview
```

## トラブルシューティング

### よくある問題と解決策

1. **APIエンドポイントに接続できない**
   - バックエンドサーバーが実行されていることを確認する
   - vite.config.ts のプロキシ設定を確認する
   - ブラウザコンソールでCORSエラーがないか確認する

2. **認証エラーが発生する**
   - ログアウトして再度ログインしてみる
   - デモユーザーの認証情報が正しいか確認する
   - ブラウザのコンソールでトークン関連のエラーがないか確認する

3. **コンポーネントが正しくレンダリングされない**
   - React DevToolsを使用してコンポーネント階層を確認する
   - propsが正しく渡されているか確認する
   - ステートの初期値やアップデートロジックを確認する

4. **ビルドエラーが発生する**
   - TypeScriptエラーを修正する
   - 依存関係を最新バージョンに更新する
   - node_modulesを削除して再インストールする

5. **パフォーマンスの問題**
   - React DevToolsの Profiler を使用してパフォーマンスボトルネックを特定する
   - 不必要な再レンダリングを React.memo, useMemo, useCallback で最適化する
   - 大きなデータセットにはページネーションを使用する

## デプロイ

### Vercelへのデプロイ

Vercelを使用したデプロイ手順：

1. GitHubリポジトリをVercelに接続
2. フレームワークプリセットをViteに設定
3. ビルドコマンドとディレクトリを確認（通常はデフォルト設定でOK）
4. 環境変数を設定（必要に応じて）
5. デプロイボタンをクリック

### 環境変数の設定

本番環境では以下の環境変数を設定してください：

```
VITE_API_BASE_URL=https://your-syncfam-backend.example.com/api/v1
```

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。
