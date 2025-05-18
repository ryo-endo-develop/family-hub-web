#!/bin/sh

# マイグレーションの実行
echo "データベースマイグレーションを実行します..."
alembic upgrade head

# アプリケーションの起動
echo "アプリケーションを起動します..."
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
