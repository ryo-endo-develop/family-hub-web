# SyncFam - 家族向けハブアプリ

## アプリ概要

SyncFamは、家族間のタスク共有と管理、スケジュール調整、献立管理、お出かけスポット記録などの機能を提供する家族向けハブアプリケーションです。

## 機能一覧

- 🔐 **ユーザー認証**: 登録、ログイン、JWTによるセッション管理
- 👨‍👩‍👧‍👦 **家族管理**: 家族の作成、メンバー追加、権限管理
- ✅ **タスク管理**: タスクの作成、割り当て、ステータス更新、タグ付け
- 🔄 **ルーティンタスク**: 毎日自動的にリセットされる定期タスク
- 🗂️ **サブタスク**: 階層構造のタスク管理
- (今後実装予定) **カレンダー**: 家族の予定共有
- (今後実装予定) **献立管理**: 献立計画と買い物リスト
- (今後実装予定) **お出かけスポット**: 家族のお出かけスポット記録

## 技術スタック

### フロントエンド
- React (Vite)
- TypeScript
- Redux Toolkit
- Material UI (MUI)
- React Router
- React Hook Form + Zod

### バックエンド
- FastAPI (Python)
- SQLAlchemy 2.0
- PostgreSQL
- JWT認証
- Alembic (マイグレーション)
- Docker

## 開発環境のセットアップ

### 前提条件
- Docker と Docker Compose がインストールされていること
- Node.js 18以上がインストールされていること

### バックエンドのセットアップ

1. リポジトリのクローン:
```bash
git clone https://github.com/your-username/family-hub-web.git
cd family-hub-web/backend
```

2. 環境変数ファイルの作成:
```bash
cp .env.example .env
# 必要に応じて.envファイルを編集
```

3. Dockerでバックエンドを起動:
```bash
docker compose up -d
```

4. データベースのマイグレーション:
```bash
docker compose exec api alembic upgrade head
```

5. デモデータのセットアップ:
```bash
docker compose exec api python setup_demo.py
```

### フロントエンドのセットアップ

1. フロントエンドディレクトリに移動:
```bash
cd ../frontend
```

2. 依存パッケージのインストール:
```bash
npm install
# または
yarn install
```

3. 開発サーバーの起動:
```bash
npm run dev
# または
yarn dev
```

4. ブラウザでアプリにアクセス:
```
http://localhost:3000
```

## デモアカウント情報

バックエンドのセットアップ後に作成されるデモアカウント:

- **田中太郎**: dad@example.com / password123
- **田中花子**: mom@example.com / password123
- **佐藤一郎**: grandpa@example.com / password123

## API ドキュメント

バックエンドが起動している状態で以下のURLにアクセスするとAPI仕様を確認できます:

- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

## デプロイ情報

### バックエンドデプロイ (Render)

1. Renderダッシュボードから「New Web Service」を選択
2. リポジトリを選択し、「Root Directory」に「backend」を指定
3. 「Build Command」として「$ pip install -r requirements.txt」を設定
4. 「Start Command」として「$ uvicorn app.main:app --host 0.0.0.0 --port $PORT」を設定
5. 環境変数を設定（DATABASE_URL、SECRET_KEYなど）
6. 「Create Web Service」をクリック

### フロントエンドデプロイ (Vercel)

1. Vercelダッシュボードから「New Project」をクリック
2. リポジトリを選択
3. 「Root Directory」に「frontend」を指定
4. 「Framework Preset」に「Vite」を選択
5. 必要に応じて環境変数を設定
6. 「Deploy」をクリック

## ライセンス

このプロジェクトは [MITライセンス](LICENSE) の下で公開されています。
