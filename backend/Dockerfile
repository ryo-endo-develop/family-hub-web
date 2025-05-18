FROM python:3.11-slim

WORKDIR /app

# 依存関係ファイルをコピー
COPY requirements.txt .

# パッケージをインストール
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# 起動スクリプトに実行権限を付与
RUN chmod +x start.sh

# 環境変数が指定されていない場合のデフォルト値
ENV PORT=8000

# ポート管理
# Renderなどのプラットフォームでは環境変数でポートを指定する場合がある
EXPOSE ${PORT}

# 起動コマンド
CMD ["/app/start.sh"]
