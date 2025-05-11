from typing import AsyncGenerator, Dict, Generator
import os

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.deps import get_db
from app.db.session import Base
from app.main import app as main_app
# すべてのモデルをインポートして登録
from app.models.user import User
from app.models.family import Family
from app.models.task import Task

# テスト環境であることを設定
os.environ["TESTING"] = "True"

# テスト用のDBを作成
TEST_DATABASE_URL = "sqlite+aiosqlite:////tmp/test.db"

# 非同期エンジンの作成
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=True,
    future=True,
    poolclass=NullPool,
    connect_args={"check_same_thread": False},  # SQLiteで必要な設定
)

# 非同期セッションファクトリの作成
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


# テスト用のセッションを提供する関数（オーバーライド用）
async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


# 非同期でセッションを作成
@pytest_asyncio.fixture(scope="function")
async def test_session() -> AsyncGenerator[AsyncSession, None]:
    # 新しいセッションを毎回作成
    async with TestingSessionLocal() as session:
        # セッションをクリア
        await session.close()
        
        # 新しいセッションを作成
        clean_session = TestingSessionLocal()
        yield clean_session
        await clean_session.close()


# FastAPIのテストクライアント
@pytest.fixture(scope="function")
def client() -> Generator[TestClient, None, None]:
    """
    FastAPIのテストクライアントを返す
    """
    # 通常のセッションをテスト用のセッションでオーバーライド
    main_app.dependency_overrides[get_db] = override_get_db

    # テストクライアントを作成して返す
    with TestClient(main_app) as c:
        yield c

    # テスト後にオーバーライドをクリア
    main_app.dependency_overrides.clear()


# テストユーザーデータ
@pytest.fixture(scope="function")
def test_user() -> Dict[str, str]:
    """
    テストユーザーの情報を返す
    """
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "first_name": "Test",
        "last_name": "User",
    }


# テスト家族データ
@pytest.fixture(scope="function")
def test_family() -> Dict[str, str]:
    """
    テスト家族の情報を返す
    """
    return {"name": "Test Family"}


# テストタスクデータ
@pytest.fixture(scope="function")
def test_task() -> Dict[str, str]:
    """
    テストタスクの情報を返す
    """
    return {
        "title": "Test Task",
        "description": "This is a test task",
        "status": "pending",
        "priority": "medium",
        "is_routine": False,
    }
