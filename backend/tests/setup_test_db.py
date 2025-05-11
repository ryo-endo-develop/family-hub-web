"""
テスト用データベースの初期化スクリプト
"""
import asyncio
import os

from sqlalchemy.ext.asyncio import create_async_engine

from app.db.session import Base
from app.models.user import User
from app.models.family import Family
from app.models.task import Task


async def setup_test_db():
    """
    テスト用データベースを初期化する
    """
    # 環境変数を設定
    os.environ["TESTING"] = "True"

    # SQLiteデータベースファイル
    db_file = "/tmp/test.db"

    # 既存のファイルを削除（存在する場合）
    if os.path.exists(db_file):
        os.unlink(db_file)
        print(f"Removed existing test database: {db_file}")

    # テスト用のDBエンジンを作成
    test_engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_file}",
        echo=True,
        future=True,
        connect_args={"check_same_thread": False},
    )

    # テーブルを作成
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print(f"Test database initialized: {db_file}")


if __name__ == "__main__":
    asyncio.run(setup_test_db())
