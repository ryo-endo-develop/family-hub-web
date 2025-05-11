import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

# SQLAlchemyのベースクラス
Base = declarative_base()

# 環境変数からDBのURLを取得（デフォルト値も設定）
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/syncfam"
)

# テスト中かどうかを確認
TESTING = os.getenv("TESTING", "False").lower() in ("true", "1", "t")

# テスト中はSQLiteを使用
if TESTING:
    SQLALCHEMY_DATABASE_URL = (
        "sqlite+aiosqlite:////tmp/test.db"
    )  # ファイルベースのデータベースを使用
    # SQLiteに必要な設定を追加
    connect_args = {"check_same_thread": False}
else:
    connect_args = {}

# 非同期エンジンの作成
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=True,  # SQLログを出力（開発時のみ）
    future=True,
    connect_args=connect_args,
    # SQLiteのJSON対応（テスト用）
    json_serializer=lambda obj: str(obj) if TESTING else None,
)

# 非同期セッションファクトリの作成
SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def init_db() -> None:
    """
    非同期にDBを初期化する関数
    """
    async with engine.begin() as conn:
        # テーブルをすべて作成
        await conn.run_sync(Base.metadata.create_all)
