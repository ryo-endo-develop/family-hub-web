import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

# SQLAlchemyのベースクラス
Base = declarative_base()

# テスト中かどうかを確認
TESTING = os.getenv("TESTING", "False").lower() in ("true", "1", "t")

# デバッグモードかどうか
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")

# データベースURLを取得（環境変数から）
if TESTING:
    # テスト環境ではSQLiteを使用
    DATABASE_URL = "sqlite+aiosqlite:////tmp/test.db"
    connect_args = {"check_same_thread": False}
    print(f"テスト環境のデータベースURL: {DATABASE_URL}")
else:
    # 本番/ローカル環境ではPostgreSQLを使用（環境変数から）
    DATABASE_URL = os.environ.get(
        "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/syncfam"
    )
    connect_args = {}
    print(f"データベースURL: {DATABASE_URL}")

# 非同期エンジンの作成
engine = create_async_engine(
    DATABASE_URL,
    echo=DEBUG,  # デバッグモードでSQLログを出力
    future=True,
    connect_args=connect_args,
)

# 非同期セッションファクトリの作成
SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

# DB接続用の依存性関数
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    DB接続用の依存性関数
    """
    async with SessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()

async def init_db() -> None:
    """
    データベースの初期化処理（スキーマ作成はAlembicに委譲）。
    将来的に、テーブル作成以外の初期化処理が必要な場合に使用します。
    （例: 特定のDB拡張機能の有効化など）
    """
    print("データベーススキーマの作成・マイグレーションはAlembicで行ってください。")
    print("init_db() はスキーマ作成を実行しません。")
    pass
