# SyncFam デプロイチェックリスト

このドキュメントは、SyncFamアプリケーションをプロダクション環境にデプロイする際のチェックリストです。バックエンドとフロントエンドの両方のデプロイ手順が含まれています。

## バックエンドデプロイ前の確認事項

### 環境変数と設定

- [ ] `.env.production` ファイルを作成し、適切な値を設定
  - [ ] `SECRET_KEY` に強力なランダム値を設定（`openssl rand -hex 32` で生成）
  - [ ] `DATABASE_URL` に本番環境のデータベース接続情報を設定
  - [ ] `BACKEND_CORS_ORIGINS` に許可するオリジンのみを設定
  - [ ] `DEBUG=False` に設定

### セキュリティ設定

- [ ] CORSの設定が本番ドメインのみに制限されているか確認
- [ ] JWTトークンの有効期限が適切か確認（`ACCESS_TOKEN_EXPIRE_MINUTES=30` 推奨）
- [ ] セキュリティヘッダーが適切に設定されているか確認
- [ ] HTTPSが強制されているか確認
- [ ] ログ設定が適切か確認（機密情報がログに出力されないよう設定）

### データベース設定

- [ ] データベース接続設定（接続プール、タイムアウト）が適切か確認
- [ ] マイグレーションが最新か確認
- [ ] バックアップ戦略が確立されているか確認

## フロントエンドデプロイ前の確認事項

### 環境変数と設定

- [ ] `.env.production` ファイルを作成し、適切な値を設定
  - [ ] `VITE_API_BASE_URL` に本番環境のAPIエンドポイントを設定
  - [ ] `VITE_AUTH_COOKIE_SECURE=true` に設定
  - [ ] `VITE_AUTH_COOKIE_SAMESITE=strict` に設定

### セキュリティ設定

- [ ] 本番ビルドで適切な最適化が行われているか確認
- [ ] センシティブ情報（トークンなど）がコードに含まれていないか確認
- [ ] HTTPS接続が強制されているか確認
- [ ] CSRFトークン対策が実装されているか確認

## デプロイ手順

### 1. バックエンドのデプロイ

1. 依存関係をインストール
   ```bash
   pip install -r requirements.txt
   ```

2. 環境変数を設定
   ```bash
   cp .env.production.example .env
   # .envファイルを編集して適切な値に設定
   ```

3. データベースのマイグレーション
   ```bash
   alembic upgrade head
   ```

4. サービスの起動
   ```bash
   # プロダクション用のWSGIサーバーを使用（例：Uvicorn + Gunicorn）
   gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4 --bind 0.0.0.0:8000
   ```

### 2. フロントエンドのデプロイ

1. 依存関係をインストール
   ```bash
   npm install
   ```

2. 環境変数を設定
   ```bash
   cp .env.production.example .env.production
   # .env.productionファイルを編集して適切な値に設定
   ```

3. プロダクションビルドの生成
   ```bash
   npm run build
   ```

4. 静的ファイルをWebサーバーにデプロイ
   ```bash
   # 例: Nginxの場合
   cp -r dist/* /var/www/html/
   ```

## デプロイ後の確認

- [ ] API エンドポイントにアクセスし、正常に動作するか確認
- [ ] ログインが正常に機能するか確認
- [ ] セキュリティヘッダーが適切に設定されているか確認（Chrome DevToolsの「Network」タブで確認）
- [ ] HTTPSが適切に設定されているか確認
- [ ] バックエンドとフロントエンドが正常に通信できるか確認
- [ ] CORS設定が正常に機能しているか確認

## トラブルシューティング

### バックエンド

- データベース接続エラー: `.env` ファイルの `DATABASE_URL` を確認
- CORS エラー: `BACKEND_CORS_ORIGINS` の設定と、フロントエンドのドメインが一致しているか確認
- 認証エラー: `SECRET_KEY` が正しく設定されているか確認

### フロントエンド

- API 接続エラー: `.env.production` の `VITE_API_BASE_URL` が正しいか確認
- ビルドエラー: 依存関係が正しくインストールされているか確認
- 認証エラー: Cookie の設定が正しいか確認（`VITE_AUTH_COOKIE_SECURE` と `VITE_AUTH_COOKIE_SAMESITE`）

## セキュリティ監視

定期的なセキュリティチェックを実施することをお勧めします：

- 依存パッケージの脆弱性スキャン（例: `npm audit`）
- ログの監視（認証失敗パターンなど）
- データベースのバックアップと定期メンテナンス
