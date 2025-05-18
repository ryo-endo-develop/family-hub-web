#!/bin/sh

# データベース接続設定を確認
echo "DATABASE_URL: $DATABASE_URL"

# データベース接続テストスクリプトを作成
cat > /tmp/test_db.py << 'EOL'
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# 非同期ドライバーで接続テスト
async def test_async_connection():
    db_url = os.environ.get("DATABASE_URL", "")
    
    if not db_url:
        print("DATABASE_URLが設定されていません")
        return False

    # PostgreSQLの場合、asyncpgドライバが使用されていることを確認
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
        print(f"URL修正: {db_url}")
    elif "postgresql" in db_url and "+asyncpg" not in db_url:
        db_url = db_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
        print(f"URL修正: {db_url}")
        
    try:
        print(f"接続: {db_url}")
        engine = create_async_engine(db_url)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            row = result.fetchone()  # fetchone()はもはや非同期関数ではないので、awaitを削除
            if row:
                print(f"接続テスト結果: {row[0]}")
            else:
                print("結果がありません")
        await engine.dispose()
        print("asyncpgを使用した接続成功")
        return True
    except Exception as e:
        print(f"接続エラー: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_async_connection())
    exit(0 if success else 1)
EOL

# データベース接続テスト
echo "非同期ドライバーでデータベース接続をテストします..."
python /tmp/test_db.py
connection_result=$?

if [ $connection_result -ne 0 ]; then
    echo "警告: データベース接続テストに失敗しましたが、アプリケーションは続行します"
fi

# マイグレーション実行情報を表示
echo "データベースマイグレーションを実行します..."
echo "注意: マイグレーションはアプリケーション起動時に自動的に実行されます"
echo "      問題が発生した場合はログを確認してください"

# アプリケーションの起動
echo "アプリケーションを起動します..."
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT