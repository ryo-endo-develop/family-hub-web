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

# データベースURLを取得と非同期ドライバー確保
if TESTING:
    # テスト環境ではSQLiteを使用
    DATABASE_URL = "sqlite+aiosqlite:////tmp/test.db"
    connect_args = {"check_same_thread": False}
    print(f"テスト環境のデータベースURL: {DATABASE_URL}")
else:
    # 本番/ローカル環境ではPostgreSQLを使用（環境変数から）
    raw_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/syncfam")
    
    # PostgreSQLの場合、必ずasyncpgドライバを使用するように変換
    if raw_url.startswith("postgresql://"):
        DATABASE_URL = raw_url.replace("postgresql://", "postgresql+asyncpg://")
        print(f"注意: DATABASE_URLをasyncpgドライバ用に変換しました: {DATABASE_URL}")
    else:
        DATABASE_URL = raw_url
        # URLが asyncpg を使用しているか確認
        if "postgresql" in DATABASE_URL and "+asyncpg" not in DATABASE_URL:
            print("警告: PostgreSQLを使用していますが、asyncpgドライバが指定されていません")
            print("      DATABASE_URLを 'postgresql+asyncpg://' で始まるように設定することをお勧めします")
    
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
