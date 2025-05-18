import os

from sqlalchemy import exc, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

# SQLAlchemyのベースクラス
Base = declarative_base()

# 生のURLを取得
raw_database_url = os.environ.get("DATABASE_URL")


# フォールバックメカニズム
async def init_engine_with_fallback():
    """
    非同期ドライバーを試し、失敗した場合は同期ドライバーを使用
    """
    global engine, SessionLocal

    # 最初に非同期ドライバーを試す
    try:
        if raw_database_url and raw_database_url.startswith("postgresql://"):
            # postgresql:// を postgresql+asyncpg:// に変換
            asyncpg_url = raw_database_url.replace(
                "postgresql://", "postgresql+asyncpg://"
            )

            # 接続テスト用の一時エンジン
            test_engine = create_async_engine(asyncpg_url)
            async with test_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))

            # 接続成功
            print("Successfully connected using asyncpg")
            engine = test_engine
            SessionLocal = async_sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=engine,
                expire_on_commit=False,
                class_=AsyncSession,
            )
            return
    except (exc.DBAPIError, ImportError, ModuleNotFoundError) as e:
        print(f"Failed to connect using asyncpg: {e}")

    # 非同期ドライバーに失敗した場合、同期ドライバーを試す
    try:
        if raw_database_url and raw_database_url.startswith("postgresql://"):
            # postgresql:// を postgresql+psycopg2:// に変換
            psycopg2_url = raw_database_url.replace(
                "postgresql://", "postgresql+psycopg2://"
            )

            # 同期ドライバーを使用するエンジン設定
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker

            sync_engine = create_engine(psycopg2_url)
            SyncSessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=sync_engine,
            )

            # 同期セッションを使用するラッパーを作成
            class AsyncSessionWrapper:
                def __init__(self, sync_session):
                    self.sync_session = sync_session

                async def __aenter__(self):
                    return self

                async def __aexit__(self, exc_type, exc_val, exc_tb):
                    if exc_type:
                        self.sync_session.rollback()
                    self.sync_session.close()

                async def commit(self):
                    self.sync_session.commit()

                async def rollback(self):
                    self.sync_session.rollback()

                async def close(self):
                    self.sync_session.close()

                async def execute(self, *args, **kwargs):
                    result = self.sync_session.execute(*args, **kwargs)
                    return AsyncResultWrapper(result)

                async def scalar(self, *args, **kwargs):
                    return self.sync_session.scalar(*args, **kwargs)

            class AsyncResultWrapper:
                def __init__(self, sync_result):
                    self.sync_result = sync_result

                def scalars(self):
                    return ScalarsWrapper(self.sync_result)

            class ScalarsWrapper:
                def __init__(self, sync_result):
                    self.sync_result = sync_result

                def first(self):
                    return self.sync_result.scalar_one_or_none()

                def all(self):
                    return self.sync_result.scalars().all()

            # 同期セッションを非同期セッションのように見せるためのセッションメーカー
            def get_async_session_wrapper():
                sync_session = SyncSessionLocal()
                return AsyncSessionWrapper(sync_session)

            # グローバル変数を更新
            engine = sync_engine
            SessionLocal = get_async_session_wrapper
            print("Successfully set up psycopg2 fallback")
            return
    except Exception as e:
        print(f"Failed to set up psycopg2 fallback: {e}")

    raise RuntimeError("Could not set up any database connection")


# テスト中かどうかを確認
TESTING = os.getenv("TESTING", "False").lower() in ("true", "1", "t")

# 開発環境かどうか確認
DEVELOPMENT = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")

# データベースURLが設定されていない場合
if not raw_database_url:
    if TESTING:
        # テスト中はSQLiteを使用
        SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:////tmp/test.db"
    elif DEVELOPMENT:
        # 開発環境のデフォルト値
        SQLALCHEMY_DATABASE_URL = (
            "postgresql+asyncpg://postgres:postgres@localhost:5432/syncfam"
        )
        print(
            "警告: 開発環境でのみ使用されるデフォルトのデータベースURLを使用しています。"
        )
    else:
        # 本番環境ではエラー
        raise ValueError(
            "データベースURLが設定されていません。本番環境ではDATABASE_URL環境変数が必要です。"
        )

    # 接続引数を設定
    connect_args = {}
    if TESTING or SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        # SQLiteの場合の設定
        connect_args = {"check_same_thread": False}

    # DBエンジン設定
    engine_args = {
        "echo": DEVELOPMENT,  # 開発環境でのみログ出力
        "future": True,
        "connect_args": connect_args,
        # 接続プール設定
        "pool_size": 5,  # デフォルトの接続数
        "max_overflow": 10,  # 最大超過接続数
        "pool_timeout": 30,  # 接続タイムアウト(秒)
        "pool_recycle": 1800,  # 30分で接続をリサイクル
    }

    # SQLiteのJSON対応（テスト用）
    if TESTING:
        engine_args["json_serializer"] = lambda obj: str(obj)

    # 非同期エンジンの作成
    engine = create_async_engine(SQLALCHEMY_DATABASE_URL, **engine_args)

    # 非同期セッションファクトリの作成
    SessionLocal = async_sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )
else:
    # 本番環境では起動時にエンジンを初期化
    # この時点ではエンジンとセッションを初期化せず、init_engineが呼ばれるのを待つ
    engine = None
    SessionLocal = None


# 初期化用の関数
async def init_engine():
    """
    エンジンを初期化する
    """
    global engine, SessionLocal

    # すでに初期化されている場合はスキップ
    if engine is not None and SessionLocal is not None:
        return

    # フォールバック機能を使ってエンジンを初期化
    await init_engine_with_fallback()


# 非同期セッションを取得するための依存性
async def get_db():
    """
    DB接続用の依存性関数
    """
    # エンジンが初期化されていなければ初期化
    if engine is None or SessionLocal is None:
        await init_engine()

    session = SessionLocal()
    try:
        yield session
    finally:
        await session.close()


async def init_db() -> None:
    """
    データベースの初期化処理（スキーマ作成はAlembicに委譲）。
    """
    print("データベーススキーマの作成・マイグレーションはAlembicで行ってください。")
    pass
