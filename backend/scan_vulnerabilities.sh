#!/bin/bash
# 脆弱性スキャンスクリプト - backend/scan_vulnerabilities.sh

set -e  # エラーで即終了

echo "📦 パッケージ脆弱性スキャンを開始します..."

# 必要なツールのインストール
echo "🔧 必要なツールをインストールしています..."
docker-compose exec -T api pip install --quiet safety pip-audit

# Safety によるスキャン
echo "🔍 Safety による脆弱性スキャンを実行中..."
docker-compose exec -T api safety check -r requirements.txt

# pip-audit によるスキャン
echo "🔍 pip-audit による脆弱性スキャンを実行中..."
docker-compose exec -T api pip-audit -r requirements.txt

echo "✅ パッケージ脆弱性スキャンが完了しました"

# 本番デプロイ前の確認事項を表示
echo "
🚀 本番デプロイ前のチェックリスト：
1. 環境変数: DEBUG=False, 強力なSECRET_KEYが設定されていることを確認
2. CORS設定: BACKEND_CORS_ORIGINSが本番のフロントエンドオリジンに制限されていることを確認
3. HTTPS: アプリケーションまたはプロキシを通じてHTTPSが強制されていることを確認
4. ログ: センシティブ情報がログに出力されていないことを確認
5. バックアップ: データベースバックアップが設定されていることを確認
"

exit 0
