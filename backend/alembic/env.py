import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncEngine

from alembic import context

# モデルのメタデータをインポート
from app.db.session import Base
from app.models import *  # noqa

# alembic の設定ファイルを取得
config = context.config

# セクション [alembic] の下に定義された他の設定を取得
fileConfig(config.config_file_name)

# モデルのメタデータを設定
target_metadata = Base.metadata

# DATABASE_URL 環境変数があれば、それを使用
if os.environ.get("DATABASE_URL"):
    raw_url = os.environ["DATABASE_URL"]

    # asyncpgを使用するためにURLを変換
    if raw_url.startswith("postgresql://"):
        async_url = raw_url.replace("postgresql://", "postgresql+asyncpg://")
        print(f"注意: DATABASE_URLをasyncpgドライバ用に変換しました: {async_url}")
        config.set_main_option("sqlalchemy.url", async_url)
    else:
        # 既にドライバが指定されている可能性があるので確認
        if "postgresql" in raw_url and "+asyncpg" not in raw_url:
            print("警告: PostgreSQLを使用していますが、asyncpgドライバが指定されていません")
            print("      URL: ", raw_url)
            # 一般的な置換を試みる
            fixed_url = raw_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
            fixed_url = fixed_url.replace("postgres://", "postgresql+asyncpg://")
            if fixed_url != raw_url:
                print(f"URLを修正しました: {fixed_url}")
                raw_url = fixed_url
        
        config.set_main_option("sqlalchemy.url", raw_url)


def run_migrations_offline() -> None:
    """
    SQLAlchemy URL を使用して新しいエンジンを作成せずにマイグレーションを実行

    このシナリオでは、トランザクションはオフラインで実行され、
    手動介入が必要な場合に使用する（スクリプトのみ生成）
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """
    マイグレーション実行メイン処理
    """
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """
    Engine を使用してマイグレーションを実行

    このシナリオでは、マイグレーションは自動的に実行される
    """
    # 現在のURLを取得して確認
    current_url = config.get_main_option("sqlalchemy.url")
    print(f"Using database URL: {current_url}")
    
    # PostgreSQLの場合、asyncpgドライバが使用されていることを確認
    if "postgresql" in current_url and "+asyncpg" not in current_url:
        # 応急処置でURLを修正
        fixed_url = current_url.replace("postgresql://", "postgresql+asyncpg://")
        fixed_url = fixed_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
        if fixed_url != current_url:
            print(f"警告: asyncpgドライバを使用するようにURLを修正しました: {fixed_url}")
            config.set_main_option("sqlalchemy.url", fixed_url)
            current_url = fixed_url
    
    try:
        connectable = AsyncEngine(
            engine_from_config(
                config.get_section(config.config_ini_section),
                prefix="sqlalchemy.",
                poolclass=pool.NullPool,
                future=True,
            )
        )

        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)

        await connectable.dispose()
    except Exception as e:
        import traceback
        print(f"Error during migrations: {e}")
        traceback.print_exc()
        raise


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
