import os

from sqlalchemy import exc, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

# SQLAlchemyのベースクラス
Base = declarative_base()

# テスト中かどうかを確認
TESTING = os.getenv("TESTING", "False").lower() in ("true", "1", "t")

# 開発環境かどうか確認
DEVELOPMENT = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")

# 生のURLを取得
# DATABASE_URLに加えて、Renderで使われるPOSTGRES_URLやRENDER_DATABASE_URLもチェック
raw_database_url = (
    os.environ.get("DATABASE_URL")
    or os.environ.get("POSTGRES_URL")
    or os.environ.get("RENDER_DATABASE_URL")
)

print(f"環境変数から取得したデータベースURL: {raw_database_url}")


# フォールバックメカニズム
async def init_engine_with_fallback():
    """
    非同期ドライバーを試し、失敗した場合は同期ドライバーを使用
    """
    global engine, SessionLocal

    # 環境変数データベースURLを表示
    print(f"DATABASE_URL: {raw_database_url}")

    # データベースURLが設定されていない場合はエラー
    if not raw_database_url:
        print("エラー: データベースURLが設定されていません")
        if TESTING:
            print("テストモードで実行されているため、SQLiteを使用します")
            sqlite_url = "sqlite+aiosqlite:////tmp/test.db"
            engine = create_async_engine(
                sqlite_url, connect_args={"check_same_thread": False}
            )
            SessionLocal = async_sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=engine,
                expire_on_commit=False,
                class_=AsyncSession,
            )
            return
        elif DEVELOPMENT:
            print("開発環境で実行されているため、ローカルPostgreSQLを使用します")
            local_pg_url = (
                "postgresql+asyncpg://postgres:postgres@localhost:5432/syncfam"
            )
            try:
                engine = create_async_engine(local_pg_url)
                SessionLocal = async_sessionmaker(
                    autocommit=False,
                    autoflush=False,
                    bind=engine,
                    expire_on_commit=False,
                    class_=AsyncSession,
                )
                return
            except Exception as e:
                print(f"ローカルPostgreSQLへの接続に失敗しました: {e}")
        else:
            print("本番環境でDATABASE_URLが設定されていません")
            raise ValueError("データベースURLが設定されていません")

    # 今の環境を表示
    if TESTING:
        print("テスト環境で実行中")
    elif DEVELOPMENT:
        print("開発環境で実行中")
    else:
        print("本番環境で実行中")

    # Render特有の変換処理
    if raw_database_url and "@postgres:" in raw_database_url:
        # Renderの内部接続形式を外部形式に変換
        print("警告: Renderの内部DB形式を変換します")
        # postgres://user:pass@postgres:5432/db を
        # postgres://user:pass@postgres.render.com:5432/db に変換
        raw_database_url = raw_database_url.replace(
            "@postgres:", "@postgres.render.com:"
        )
        print(f"変換後のURL: {raw_database_url}")

    # 最初に非同期ドライバーを試す
    try:
        if raw_database_url and raw_database_url.startswith("postgresql://"):
            # postgresql:// を postgresql+asyncpg:// に変換
            asyncpg_url = raw_database_url.replace(
                "postgresql://", "postgresql+asyncpg://"
            )

            print(f"接続を試みます: {asyncpg_url}")

            # 接続テスト用の一時エンジン
            test_engine = create_async_engine(
                asyncpg_url,
                # 接続プール設定
                pool_size=5,  # デフォルトの接続数
                max_overflow=10,  # 最大超過接続数
                pool_timeout=30,  # 接続タイムアウト(秒)
                pool_recycle=1800,  # 30分で接続をリサイクル
                echo=DEVELOPMENT,  # 開発環境でのみログ出力
            )

            # 接続テスト
            try:
                async with test_engine.begin() as conn:
                    await conn.execute(text("SELECT 1"))
                print("接続テスト成功")

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
            except Exception as conn_err:
                print(f"接続テスト失敗: {conn_err}")
                raise
    except (exc.DBAPIError, ImportError, ModuleNotFoundError) as e:
        print(f"Failed to connect using asyncpg: {e}")
        print(f"Error type: {type(e).__name__}")
        if isinstance(e, exc.DBAPIError):
            print(f"SQLAlchemy error code: {e.code}")

        # トレースバックを出力
        import traceback

        traceback.print_exc()

    # 非同期ドライバーに失敗した場合、同期ドライバーを試す
    try:
        print("同期ドライバー (psycopg2) での接続を試みます...")
        if raw_database_url and raw_database_url.startswith("postgresql://"):
            # postgresql:// を postgresql+psycopg2:// に変換
            psycopg2_url = raw_database_url.replace(
                "postgresql://", "postgresql+psycopg2://"
            )

            # 同期ドライバーを使用するエンジン設定
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker

            sync_engine = create_engine(
                psycopg2_url,
                pool_size=5,
                max_overflow=10,
                pool_timeout=30,
                pool_recycle=1800,
                echo=DEVELOPMENT,
            )

            # 接続テスト
            try:
                with sync_engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                print("同期接続テスト成功")
            except Exception as conn_err:
                print(f"同期接続テスト失敗: {conn_err}")
                raise

            SyncSessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=sync_engine,
            )

            # 同期セッションを使用するラッパーを作成
            class AsyncSessionWrapper:
                def __init__(self, sync_session=None):
                    self.sync_session = sync_session or SyncSessionLocal()

                async def __aenter__(self):
                    return self

                async def __aexit__(self, exc_type, exc_val, exc_tb):
                    if exc_type:
                        self.sync_session.rollback()
                    self.sync_session.close()

                async def commit(self):
                    try:
                        self.sync_session.commit()
                    except Exception as e:
                        print(f"コミットエラー: {e}")
                        self.sync_session.rollback()
                        raise

                async def rollback(self):
                    self.sync_session.rollback()

                async def close(self):
                    self.sync_session.close()

                async def execute(self, query, *args, **kwargs):
                    try:
                        # クエリを文字列化してログを出力
                        if isinstance(query, str):
                            print(f"実行クエリ: {query}")
                        result = self.sync_session.execute(query, *args, **kwargs)
                        return AsyncResultWrapper(result)
                    except Exception as e:
                        print(f"クエリ実行エラー: {e}")
                        raise

                async def scalar(self, *args, **kwargs):
                    return self.sync_session.scalar(*args, **kwargs)

                async def refresh(self, obj):
                    self.sync_session.refresh(obj)

                async def add(self, obj):
                    self.sync_session.add(obj)

                async def delete(self, obj):
                    self.sync_session.delete(obj)

            class AsyncResultWrapper:
                def __init__(self, sync_result):
                    self.sync_result = sync_result

                def scalars(self):
                    return ScalarsWrapper(self.sync_result)

                def scalar_one_or_none(self):
                    return self.sync_result.scalar_one_or_none()

                def scalar_one(self):
                    return self.sync_result.scalar_one()

                def unique(self):
                    return self

            class ScalarsWrapper:
                def __init__(self, sync_result):
                    self.sync_result = sync_result

                def first(self):
                    return self.sync_result.scalar_one_or_none()

                def all(self):
                    return self.sync_result.scalars().all()

                def one_or_none(self):
                    return self.sync_result.scalar_one_or_none()

                def one(self):
                    return self.sync_result.scalar_one()

            # 同期セッションを非同期セッションのように見せるためのセッションメーカー
            def get_async_session_wrapper():
                return AsyncSessionWrapper()

            # グローバル変数を更新
            engine = sync_engine
            SessionLocal = get_async_session_wrapper
            print("Successfully set up psycopg2 fallback")
            return
    except Exception as e:
        print(f"Failed to set up psycopg2 fallback: {e}")
        import traceback

        traceback.print_exc()

    # SQLiteをフォールバックとして試す
    try:
        print("最終手段としてSQLiteを使用してみます...")
        sqlite_url = "sqlite+aiosqlite:////tmp/fallback.db"
        sqlite_engine = create_async_engine(
            sqlite_url, connect_args={"check_same_thread": False}
        )

        # SQLiteテーブルの作成
        print("SQLiteデータベースの初期化中...")
        async with sqlite_engine.begin() as conn:
            # 基本的なテーブルを作成
            await conn.execute(
                text("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE
            );
            """)
            )

            # テストユーザーを作成
            await conn.execute(
                text("""
            INSERT OR IGNORE INTO users (id, email, hashed_password, first_name, last_name)
            VALUES (
                '00000000-0000-0000-0000-000000000001',
                'test@example.com',
                '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
                'Test',
                'User'
            );
            """)
            )

            print("SQLite基本テーブルの作成成功")

        # 非同期セッションメーカー
        sqlite_session = async_sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=sqlite_engine,
            expire_on_commit=False,
            class_=AsyncSession,
        )

        # グローバル変数を更新
        engine = sqlite_engine
        SessionLocal = sqlite_session
        print("Successfully set up SQLite fallback")
        return
    except Exception as e:
        print(f"Failed to set up SQLite fallback: {e}")
        import traceback

        traceback.print_exc()

    raise RuntimeError("Could not set up any database connection")

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
        print("データベースエンジンはすでに初期化されています")
        return

    try:
        print("データベースエンジンの初期化を開始します...")
        # フォールバック機能を使ってエンジンを初期化
        await init_engine_with_fallback()

        # 結果を確認
        if engine is None or SessionLocal is None:
            print("エンジンまたはセッションが初期化されていません")
            print(f"Engine: {engine}, SessionLocal: {SessionLocal}")
            raise RuntimeError("データベースエンジンの初期化に失敗しました")

        print("データベースエンジンの初期化が完了しました")
    except Exception as e:
        import traceback

        print(f"データベースエンジンの初期化中にエラーが発生しました: {e}")
        traceback.print_exc()
        raise


# 引き続き、非同期セッションを取得するための依存性
async def get_db():
    """
    DB接続用の依存性関数
    """
    try:
        # エンジンが初期化されていなければ初期化
        if engine is None or SessionLocal is None:
            print("データベースエンジンを初期化しています...")
            await init_engine()

        if SessionLocal is None:
            print("データベースセッションが正しく初期化されていません")
            raise RuntimeError("データベースセッションが正しく初期化されていません")

        print("データベースセッションを作成します")
        db = SessionLocal()
        print("データベースセッションの作成成功")

        try:
            yield db
        finally:
            if db is not None:
                print("データベースセッションを閉じます")
                await db.close()
                print("データベースセッションを閉じました")
    except Exception as e:
        import traceback

        print(f"データベースセッションの取得エラー: {e}")
        traceback.print_exc()
        raise


async def init_db() -> None:
    """
    データベースの初期化処理（スキーマ作成はAlembicに委譲）。
    """
    print("データベーススキーマの作成・マイグレーションはAlembicで行ってください。")
    pass
