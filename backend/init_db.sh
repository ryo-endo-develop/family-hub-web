#!/bin/sh

# このスクリプトはRenderに最初のデプロイ時にデータベースを初期化します

# 環境の詳細を表示
echo "データベースを初期化しています..."
echo "Pythonバージョン:"
python --version

# Alembicマイグレーションを実行
echo "マイグレーションを実行しています..."
cd /app && python -m alembic upgrade head

# デモデータの作成
echo "デモデータを作成しています..."
cd /app && python setup_demo.py

echo "データベースの初期化が完了しました。"