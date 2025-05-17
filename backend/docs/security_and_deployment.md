# セキュリティとデプロイ

## パッケージ脆弱性スキャン

SyncFamでは、パッケージの脆弱性をスキャンするためのツールとスクリプトを提供しています。

### ローカル環境での脆弱性スキャン

#### 前提条件

- Docker と Docker Compose がインストールされていること
- プロジェクトがクローンされていること

#### スキャンの実行方法

1. **スクリプトに実行権限を付与（初回のみ）**:

```bash
chmod +x scan_vulnerabilities.sh
```

2. **Makefileを使用してスキャンを実行（推奨）**:

```bash
make security
```

3. **または、スクリプトを直接実行**:

```bash
./scan_vulnerabilities.sh
```

このスクリプトは以下の処理を実行します：
- `safety` と `pip-audit` ツールをインストール
- `requirements.txt` の脆弱性をスキャン
- インストール済みパッケージの脆弱性をスキャン
- デプロイ前チェックリストを表示

### CI/CDパイプラインでの脆弱性スキャン

GitHub Actionsなどの自動化パイプラインにセキュリティスキャンを組み込むサンプル:

```yaml
name: Security Scan

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install safety pip-audit
      - name: Run security scan
        run: |
          cd backend
          safety check -r requirements.txt
          pip-audit -r requirements.txt
```

## 本番環境デプロイガイド

### 環境変数とセキュリティ設定

本番環境にデプロイする際の必須設定:

1. **基本設定**:
   - `DEBUG=False` - デバッグモードを無効化
   - `SECRET_KEY=[強力なランダム文字列]` - 強力な秘密鍵を設定
   - `BACKEND_CORS_ORIGINS=["https://yourdomain.com"]` - フロントエンドドメインのみを許可

2. **セキュリティ強化**:
   - HTTPSの強制 - HTTP→HTTPSへのリダイレクトが自動的に有効化
   - セキュリティヘッダー - 適切なCSP, HSTS等が設定済み
   - センシティブデータのマスク - ログにパスワード等のセンシティブ情報が出力されないよう設定済み

### Renderへのデプロイ

Renderは簡単にコンテナベースのデプロイを行えるクラウドプラットフォームです。

#### Render.yaml の設定例

```yaml
services:
  # バックエンドAPI
  - type: web
    name: syncfam-api
    env: docker
    dockerfilePath: ./backend/Dockerfile
    region: oregon
    plan: standard
    branch: main
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: syncfam-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: false
      - key: BACKEND_CORS_ORIGINS
        value: '["https://syncfam-web.onrender.com"]'
    healthCheckPath: /health
    autoDeploy: true

  # データベース
  - type: pgsql
    name: syncfam-db
    region: oregon
    plan: standard
    ipAllowList: []  # 必要に応じて制限を追加
```

#### Render上でのデプロイ手順

1. Renderでアカウントを作成し、GitHubリポジトリを連携
2. 「Blueprint」から新しいサービスを作成し、render.yamlファイルを指定
3. サービスが起動したら、以下のコマンドを実行してマイグレーション実行:

```bash
# Renderのコンソールからシェルを起動
cd /app
alembic upgrade head
python -m app.scripts.setup_demo  # 初期データが必要な場合のみ
```

### Vercelへのデプロイ (フロントエンド)

Vercelは主にフロントエンドのデプロイに使用されますが、以下の設定でAPIと連携できます。

#### フロントエンドの環境変数設定

```
VITE_API_BASE_URL=https://your-backend-api.render.com/api/v1
```

#### Vercelのデプロイ設定

1. Vercelダッシュボードで新しいプロジェクトを作成
2. GitHubリポジトリを連携
3. ビルド設定:
   - Framework Preset: Vite
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/dist`
4. 環境変数を設定
5. デプロイを実行

### データベースバックアップとリカバリー

本番環境では、定期的なデータベースバックアップを設定することが重要です。

#### 手動バックアップ

```bash
# PostgreSQLデータベースのバックアップ
pg_dump -U username -h hostname -d syncfam > syncfam_backup_$(date +%Y%m%d).sql

# バックアップからの復元
psql -U username -h hostname -d syncfam < syncfam_backup_20230101.sql
```

#### 自動バックアップの設定 (cron)

```bash
# /etc/cron.d/syncfam-backups
0 2 * * * postgres pg_dump -U postgres syncfam | gzip > /backups/syncfam_$(date +\%Y\%m\%d).sql.gz
```

### 本番環境セキュリティチェックリスト

デプロイ前に以下の項目を確認してください：

- [ ] DEBUG=False が設定されているか
- [ ] 強力なSECRET_KEYが設定されているか
- [ ] CORS設定が適切に制限されているか
- [ ] データベース接続情報が安全に管理されているか
- [ ] パッケージ脆弱性スキャンが実行され、問題が解決されているか
- [ ] HTTPS強制リダイレクトが有効になっているか
- [ ] データベースバックアップが設定されているか
- [ ] ログ設定が適切で、センシティブ情報が出力されないか
