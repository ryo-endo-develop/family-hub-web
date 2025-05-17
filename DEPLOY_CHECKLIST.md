# SyncFam アプリケーション デプロイ前チェックリスト

## フロントエンド（Vercel）

- [ ] GitHubリポジトリがVercelと連携されている
- [ ] 環境変数 `VITE_API_BASE_URL` がバックエンドのURL（例: `https://your-backend.onrender.com/api/v1`）に設定されている
- [ ] ビルドコマンドが `npm run build` に設定されている
- [ ] 出力ディレクトリが `dist` に設定されている
- [ ] 必要なすべての依存関係が `package.json` に記載されている

## バックエンド（Render）

### データベース

- [ ] Renderで新しいPostgreSQL DBサービスを作成
- [ ] 内部接続文字列を控えておく（`postgresql+asyncpg://user:pass@host:port/db`）

### Webサービス

- [ ] GitHubリポジトリがRenderと連携されている
- [ ] `Dockerfile` を使用した設定になっている
- [ ] 環境変数の設定：
  - [ ] `DATABASE_URL`: Renderで作成したPostgreSQLの内部接続文字列
  - [ ] `SECRET_KEY`: 強力な暗号学的に安全な文字列
  - [ ] `ALGORITHM`: HS256
  - [ ] `ACCESS_TOKEN_EXPIRE_MINUTES`: 適切な値（例: 60）
  - [ ] `DEBUG`: False
  - [ ] `BACKEND_CORS_ORIGINS`: フロントエンドのURL配列（例: `["https://your-frontend.vercel.app"]`）
- [ ] ヘルスチェックパスを `/health` に設定
- [ ] デプロイ後、マイグレーションの実行：
  ```bash
  cd /app
  alembic upgrade head
  ```
- [ ] （任意）デモデータのセットアップ：
  ```bash
  cd /app
  python -c "import asyncio; from app.scripts.setup_demo_data import setup_demo_data; asyncio.run(setup_demo_data())"
  ```

## デプロイ後のチェック

- [ ] フロントエンドのログインページが表示されることを確認
- [ ] ユーザー登録ができることを確認
- [ ] ログインできることを確認
- [ ] タスクの作成・編集・削除が機能することを確認
- [ ] ルーティンタスクが機能していることを確認（完了後、翌日に再度未完了状態になるか）
- [ ] 家族メンバーの管理が機能することを確認

## トラブルシューティング

- フロントエンドとバックエンド間の通信エラー → CORSの設定を確認
- データベース接続エラー → 環境変数 `DATABASE_URL` の値を確認
- 認証エラー → `SECRET_KEY` の設定を確認
- インフラ関連エラー → サービスのログを確認

## カスタムドメイン設定（任意）

- [ ] ドメイン取得サービスでカスタムドメインを取得
- [ ] フロントエンド（Vercel）にカスタムドメインを設定
- [ ] バックエンド（Render）にカスタムドメインを設定
- [ ] `BACKEND_CORS_ORIGINS` の値をカスタムドメインに更新
