import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

# SQLAlchemyのベースクラス
Base = declarative_base()

# 環境変数からDBのURLを取得
# デフォルト値は開発環境でのみ使用、本番環境では必ずDATABASE_URLを設定する
raw_database_url = os.environ.get("DATABASE_URL")

# asyncpgを使用するためにURLを変換する
def convert_to_asyncpg_url(url):
    if url and url.startswith("postgresql://"):
        # postgresql:// を postgresql+asyncpg:// に変換
        return url.replace("postgresql://", "postgresql+asyncpg://")
    return url

SQLALCHEMY_DATABASE_URL = convert_to_asyncpg_url(raw_database_url)

# テスト中かどうかを確認
TESTING = os.getenv("TESTING", "False").lower() in ("true", "1", "t")

# 開発環境かどうか確認
DEVELOPMENT = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")

# データベースURLが設定されていない場合
if not SQLALCHEMY_DATABASE_URL:
    if TESTING:
        # テスト中はSQLiteを使用
        SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:////tmp/test.db"
    elif DEVELOPMENT:
        # 開発環境のデフォルト値
        SQLALCHEMY_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/syncfam"
        print("警告: 開発環境でのみ使用されるデフォルトのデータベースURLを使用しています。")
    else:
        # 本番環境ではエラー
        raise ValueError("データベースURLが設定されていません。本番環境ではDATABASE_URL環境変数が必要です。")

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
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    **engine_args
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
    データベースの初期化処理（スキーマ作成はAlembicに委譲）。
    将来的に、テーブル作成以外の初期化処理が必要な場合に使用します。
    （例: 特定のDB拡張機能の有効化など）
    """
    # async with engine.begin() as conn:
    #     # テーブルをすべて作成する処理はAlembicに任せるため削除
    #     # await conn.run_sync(Base.metadata.create_all)
    print("データベーススキーマの作成・マイグレーションはAlembicで行ってください。")
    print("init_db() はスキーマ作成を実行しません。")
    pass
