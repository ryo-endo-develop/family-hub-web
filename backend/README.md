# SyncFam - 家族向けハブアプリケーション バックエンド

SyncFam は、家族向けのタスク管理・スケジュール調整・献立管理・お出かけスポット記録などの機能を提供するハブアプリケーションです。このリポジトリはバックエンド API の実装です。

## 目次

- [技術スタック](#技術スタック)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [API エンドポイント](#api-エンドポイント)
- [開発ガイドライン](#開発ガイドライン)
- [コード品質管理](#コード品質管理)
- [セキュリティとデプロイ](#セキュリティとデプロイ)

## 技術スタック

- **Web Framework**: FastAPI
- **ORM**: SQLAlchemy 2.0
- **データベース**: PostgreSQL
- **認証**: JWT (JSON Web Tokens)
- **コンテナ化**: Docker & Docker Compose
- **テスト**: pytest

## 開発環境のセットアップ

### 前提条件

- Docker と Docker Compose がインストールされていること
- Python 3.11 以上がインストールされていること（ローカル開発の場合）

### Docker を使った環境構築（推奨）

1. リポジトリをクローン:

```bash
git clone https://github.com/your-username/family-hub-web.git
cd family-hub-web/backend
```

2. .env ファイルを作成:

```bash
cp .env.example .env
# 必要に応じて .env を編集
```

3. Docker Compose でビルドと起動:

```bash
docker compose up -d --build
```

4. 依存パッケージの更新があった場合は、コンテナの再ビルドが必要です:

```bash
docker compose down
docker compose up -d --build
```

5. データベースのマイグレーション

```bash
docker compose exec api alembic upgrade head
```

6. API ドキュメントへのアクセス:

- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

### データベースの確認

1. データベースコンテナに接続

```bash
docker compose exec db psql -U postgres -d syncfam
```

2. 接続後の主なコマンド

```sql
-- テーブル一覧の表示
\dt

-- テーブルの詳細情報を確認
\d+ users

-- ユーザーテーブルの内容確認
SELECT * FROM users;

-- 家族テーブルの内容確認
SELECT * FROM families;

-- タスクテーブルの内容確認
SELECT * FROM tasks;

-- データベース終了
\q
```

### デモデータのセットアップ

開発やテストを容易にするために、デモデータをセットアップすることができます。

#### デモデータのセットアップ方法

1. **Swagger UI を使用する場合**:

   - http://localhost:8000/api/v1/docs にアクセス
   - `/api/v1/setup-demo` エンドポイントを見つけて「Try it out」ボタンをクリック
   - 「Execute」ボタンをクリックしてデモデータをセットアップ

2. **コマンドラインを使用する場合**:

   ```bash
   # Makefileを使用する場合
   make setup-demo

   # または直接コマンドを実行する場合
   docker compose exec api python setup_demo.py
   ```

#### デモユーザーアカウント

デモデータをセットアップすると、以下のユーザーアカウントが作成されます：

- **田中太郎**: dad@example.com / password123
- **田中花子**: mom@example.com / password123
- **佐藤一郎**: grandpa@example.com / password123

### Swagger UI での操作方法

Swagger UI で API を操作する際の基本的な手順：

1. **デモデータのセットアップ**:

   - Swagger UI (http://localhost:8000/api/v1/docs) にアクセス
   - 「development」タグの下にある `/api/v1/setup-demo` エンドポイントを開く
   - 「Try it out」ボタンをクリック
   - 「Execute」ボタンをクリックしてデモデータをセットアップ

#### 別の方法: API からトークンを取得して手動で設定

または、以下の手順で JWT トークンを取得して API を操作することも可能です（高度なシナリオやカスタムクライアントテスト用）：

1. **トークンの取得**:

   - `/api/v1/auth/login` エンドポイントに POST リクエストを送信

   ```bash
   curl -X 'POST' \
     'http://localhost:8000/api/v1/auth/login' \
     -H 'accept: application/json' \
     -H 'Content-Type: application/x-www-form-urlencoded' \
     -d 'username=dad@example.com&password=password123'
   ```

   - レスポンスからアクセストークンを取得

2. **API リクエストへのトークン添付**:
   ```bash
   curl -X 'GET' \
     'http://localhost:8000/api/v1/families' \
     -H 'accept: application/json' \
     -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   ```

### 将来的な OIDC 認証への移行

現在は JWT ベースの単純な認証を使用していますが、将来的には OIDC (OpenID Connect) 認証に移行することを計画しています。OIDC 認証に移行することで、以下のメリットがあります：

- Single Sign-On (SSO) 対応
- より強固な認証フロー
- 外部 ID プロバイダ（Google、GitHub、Microsoft など）との連携
- マルチファクタ認証のサポート

OIDC 実装時には、本 README も更新する予定です。

### ローカル開発環境のセットアップ（Docker なしの場合）

1. リポジトリをクローン:

```bash
git clone https://github.com/your-username/family-hub-web.git
cd family-hub-web/backend
```

2. 仮想環境の作成と有効化:

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. 依存関係のインストール:

```bash
pip install -r requirements.txt
```

4. .env ファイルを作成:

```bash
cp .env.example .env
# ローカル環境用に .env を編集
```

5. アプリケーションの起動:

```bash
uvicorn app.main:app --reload
```

## API エンドポイント

すべての API エンドポイントは統一されたレスポンス形式を返します：

```json
{
  "data": <データ>,
  "message": "操作に関するメッセージ",
  "errors": null,  // エラーがある場合は配列が返される
  "success": true  // 操作が成功したかどうかを示すフラグ
}
```

ページネーションを含むエンドポイントでは、以下の追加情報も返されます：

```json
{
  "data": <データ>,
  "message": "操作に関するメッセージ",
  "errors": null,
  "success": true,
  "total": 100,  // 合計件数
  "page": 1,     // 現在のページ番号
  "size": 10,    // 現在のページのアイテム数
  "pages": 10    // 総ページ数
}
```

### 認証

- `POST /api/v1/auth/register` - ユーザー登録
- `POST /api/v1/auth/login` - ログイン（JWT 取得）

### ユーザー

- `GET /api/v1/users/me` - 自分のプロフィール取得
- `PUT /api/v1/users/me` - 自分のプロフィール更新

### 家族

- `POST /api/v1/families` - 家族作成
- `GET /api/v1/families` - 自分の家族一覧取得
- `GET /api/v1/families/{family_id}` - 家族詳細取得
- `PUT /api/v1/families/{family_id}` - 家族情報更新
- `POST /api/v1/families/{family_id}/members` - 家族メンバー追加
- `GET /api/v1/families/{family_id}/members` - 家族メンバー一覧取得
- `DELETE /api/v1/families/{family_id}/members/{user_id}` - 家族メンバー削除

### タスク

- `POST /api/v1/tasks` - タスク作成
- `GET /api/v1/tasks` - タスク一覧取得（フィルタリング可能）
- `GET /api/v1/tasks/{task_id}` - タスク詳細取得
- `PUT /api/v1/tasks/{task_id}` - タスク更新
- `DELETE /api/v1/tasks/{task_id}` - タスク削除

### タグ

- `POST /api/v1/tags` - タグ作成
- `GET /api/v1/tags/family/{family_id}` - 家族のタグ一覧取得
- `PUT /api/v1/tags/{tag_id}` - タグ更新
- `DELETE /api/v1/tags/{tag_id}` - タグ削除

### 開発用

- `POST /api/v1/setup-demo` - デモデータのセットアップ

## 開発ガイドライン

- コード変更前にテストを実行し、すべてのテストが通ることを確認してください
- 新しい機能を追加する場合は、対応するテストも追加してください
- コードは `ruff` でフォーマットおよびリントしてください
- コミット前に `pytest` でテストを実行してください

## コード品質管理

### フォーマットとリント

#### Docker Compose コマンドを直接使用する場合

```bash
# コードフォーマット（自動修正）
docker compose exec api ruff format ./app

# コードフォーマット（チェックのみ）
docker compose exec api ruff format ./app --check

# リント（自動修正）
docker compose exec api ruff check ./app --fix

# リント（チェックのみ）
docker compose exec api ruff check ./app

# 一括実行（チェックのみ）
docker compose exec api sh -c "ruff format ./app --check && ruff check ./app"

# 一括実行（自動修正）
docker compose exec api sh -c "ruff format ./app && ruff check ./app --fix"
```

#### Makefile を使用する場合（推奨）

```bash
# コードフォーマット（自動修正）
make format

# コードフォーマット（チェックのみ）
make format-check

# リント（自動修正）
make lint

# リント（チェックのみ）
make lint-check

# 一括実行（チェックのみ）
make quality-check
```

### テスト実行

#### Docker Compose コマンドを直接使用する場合

```bash
# すべてのテストを実行
docker compose exec -e TESTING=True api pytest

# 特定のテストファイルを実行
docker compose exec -e TESTING=True api pytest tests/test_tasks.py

# テストカバレッジレポートの生成
docker compose exec -e TESTING=True api pytest --cov=app
```

#### Makefile を使用する場合（推奨）

```bash
# すべてのテストを実行
make test
```

## セキュリティとデプロイ

SyncFamは、セキュリティを守りつつ簡単にデプロイできるよう設計されています。デプロイ前には必ず以下のセキュリティ毎項チェックを行ってください。

### 本番環境のセキュリティ機能

SyncFamには以下のセキュリティ機能が実装されています：

- **HTTPS強制リダイレクト** - `DEBUG=False` の本番環境で自動的にHTTPS強制
- **セキュリティヘッダー** - CSP, HSTS, X-Content-Type-Optionsなどの主要セキュリティヘッダー
- **センシティブ情報のマスキング** - ログ内のパスワード等の機密情報の自動マスキング
- **コード品質管理** - コードリントとフォーマットの定期的なチェック
- **パッケージ脆弱性スキャン** - パッケージの自動スキャンとアップデート

### パッケージ脆弱性スキャン

パッケージの脆弱性をスキャンするには、以下のコマンドを実行します：

```bash
# スクリプトに実行権限を付与（初回のみ）
chmod +x scan_vulnerabilities.sh

# 脆弱性スキャンを実行
make security

# または直接スクリプトを実行
./scan_vulnerabilities.sh
```

このスクリプトは以下の処理を実行します：
- `safety` と `pip-audit` ツールをインストール
- `requirements.txt` の脆弱性をスキャン
- インストール済みパッケージの脆弱性をスキャン
- デプロイ前チェックリストを表示

実行例：

```
$ make security
📜 パッケージ脆弱性スキャンを開始します...
🔧 必要なツールをインストールしています...
🔍 Safety による脆弱性スキャンを実行中...

✅ パッケージ脆弱性スキャンが完了しました

🚀 本番デプロイ前のチェックリスト：
1. 環境変数: DEBUG=False, 強力なSECRET_KEYが設定されていることを確認
2. CORS設定: BACKEND_CORS_ORIGINSが本番のフロントエンドオリジンに制限されていることを確認
3. HTTPS: アプリケーションまたはプロキシを通じてHTTPSが強制されていることを確認
4. ログ: センシティブ情報がログに出力されていないことを確認
5. バックアップ: データベースバックアップが設定されていることを確認
```

### RenderやVercelでのデプロイ

RenderやVercel等のクラウドプラットフォームへのデプロイ手順については、[セキュリティとデプロイガイド](./docs/security_and_deployment.md)を参照してください。

#### Renderへのデプロイ手順概要

1. Render.comでアカウントを作成
2. GitHubリポジトリを連携
3. Web Serviceとしてプロジェクトをデプロイするよう設定
4. 環境変数を設定（特に `DEBUG=False` と `SECRET_KEY` は必須）
5. デプロイ完了後にデータベースマイグレーションを実行

詳細な手順と環境変数の設定例は[セキュリティとデプロイガイド](./docs/security_and_deployment.md)を参照してください。

#### Vercelでフロントエンドをデプロイする場合

1. Vercel.comでアカウントを作成
2. GitHubリポジトリを連携
3. Framework PresetをViteに設定
4. ビルド設定と環境変数を構成
5. `VITE_API_BASE_URL` にバックエンドAPIのURLを設定

実行例（環境変数の設定）：
```
VITE_API_BASE_URL=https://your-syncfam-backend.render.com/api/v1
```
