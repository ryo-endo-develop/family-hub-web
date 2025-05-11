FROM python:3.11-slim

WORKDIR /app

# 依存関係ファイルをコピー
COPY requirements.txt .

# パッケージをインストール
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# 実行コマンド
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
