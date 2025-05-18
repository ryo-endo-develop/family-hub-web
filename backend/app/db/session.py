import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
import logging

# ロガーの設定
logger = logging.getLogger(__name__)

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
    logger.info(f"テスト環境のデータベースURL: {DATABASE_URL}")
else:
    # 本番/ローカル環境ではPostgreSQLを使用（環境変数から）
    raw_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/syncfam")
    
    # PostgreSQLの場合、必ずasyncpgドライバを使用するように変換
    if raw_url.startswith("postgresql://"):
        DATABASE_URL = raw_url.replace("postgresql://", "postgresql+asyncpg://")
        logger.info(f"注意: DATABASE_URLをasyncpgドライバ用に変換しました: {DATABASE_URL}")
    else:
        DATABASE_URL = raw_url
        # URLが asyncpg を使用しているか確認
        if "postgresql" in DATABASE_URL and "+asyncpg" not in DATABASE_URL:
            logger.warning("警告: PostgreSQLを使用していますが、asyncpgドライバが指定されていません")
            logger.warning("      DATABASE_URLを 'postgresql+asyncpg://' で始まるように設定することをお勧めします")
    
    connect_args = {}
    logger.info(f"データベースURL: {DATABASE_URL}")

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
    データベースの初期化処理（スキーマ作成はAlembicに委譲）
    テーブルの存在確認とマイグレーション状態確認のみを行う。
    テーブル作成はAlembicマイグレーションに一元化する。
    """
    # データベース接続を取得
    from sqlalchemy import text
    
    try:
        # テーブル存在確認用エンジン作成
        async with engine.connect() as conn:
            # usersテーブルが存在するか確認
            result = await conn.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
            ))
            users_exists = result.scalar()
            
            if not users_exists:
                logger.error("usersテーブルが存在しません。マイグレーションが実行されていない可能性があります。")
                logger.error("Alembicマイグレーションを実行してください: `alembic upgrade head`")
                
                # テーブル一覧を取得してログ出力
                logger.info("存在するテーブル一覧:")
                tables_result = await conn.execute(text(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
                ))
                tables = tables_result.fetchall()
                
                if tables:
                    for table in tables:
                        logger.info(f"  - {table[0]}")
                else:
                    logger.info("  テーブルがありません")
                
                # マイグレーションテーブルの確認
                alembic_result = await conn.execute(text(
                    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alembic_version')"
                ))
                alembic_exists = alembic_result.scalar()
                
                if alembic_exists:
                    version_result = await conn.execute(text("SELECT version_num FROM alembic_version"))
                    version = version_result.scalar()
                    logger.info(f"Alembicバージョン: {version}")
                else:
                    logger.error("alembic_versionテーブルが存在しません。マイグレーションが実行されていません。")
            else:
                logger.info("usersテーブルは存在します。マイグレーションは正常に実行されています。")
        
    except Exception as e:
        logger.error(f"データベース初期化中にエラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
