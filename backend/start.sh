#!/bin/sh

# データベース接続設定を確認
echo "DATABASE_URL: $DATABASE_URL"

# データベース接続テストスクリプトを作成
cat > /tmp/test_db.py << 'EOL'
import asyncio
import os
from sqlalchemy import create_engine, text

# 同期ドライバーで接続テスト
def test_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URLが設定されていません")
        return False
        
    try:
        print(f"Connecting to {db_url}")
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print(f"Connection test result: {result.scalar()}")
        print("Connection successful using psycopg2")
        return True
    except Exception as e:
        print(f"Connection error: {e}")
        return False

if __name__ == "__main__":
    success = test_connection()
    exit(0 if success else 1)
EOL

# データベース接続テスト
echo "データベース接続をテストします..."
python /tmp/test_db.py

# マイグレーションの実行
echo "データベースマイグレーションを実行します..."
cd /app && python -m alembic upgrade head


# アプリケーションの起動
echo "アプリケーションを起動します..."
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
