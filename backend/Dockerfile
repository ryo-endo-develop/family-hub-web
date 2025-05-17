FROM python:3.11-slim

WORKDIR /app

# 依存関係ファイルをコピー
COPY requirements.txt .

# パッケージをインストール
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# 環境変数が指定されていない場合のデフォルト値
ENV PORT=8000

# ポート管理
# Renderなどのプラットフォームでは環境変数でポートを指定する場合がある
EXPOSE ${PORT}

# 実行コマンド
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
