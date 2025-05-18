import os
from typing import Generator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy import text

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

# エンジンとセッションの初期化
engine = None
SessionLocal = None

# エンジン初期化関数
async def init_engine():
    """
    データベースエンジンを初期化する
    """
    global engine, SessionLocal
    
    # すでに初期化されている場合はスキップ
    if engine is not None and SessionLocal is not None:
        print("データベースエンジンはすでに初期化されています")
        return
    
    try:
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
        
        # 接続テスト
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        
        print("データベースエンジンの初期化が完了しました")
        
    except Exception as e:
        import traceback
        print(f"データベースエンジンの初期化中にエラーが発生しました: {e}")
        traceback.print_exc()
        raise


# アプリケーション起動時にエンジンを初期化
# テスト環境ではすぐに初期化する
if TESTING:
    import asyncio
    asyncio.run(init_engine())
else:
    # 非テスト環境では、後でアプリ起動時に初期化する
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
async def get_db() -> Generator:
    """
    DB接続用の依存性関数
    """
    db = SessionLocal()
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
