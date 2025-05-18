# SyncFam - 家族向けハブアプリケーション バックエンド

SyncFam は、家族向けのタスク管理・スケジュール調整・献立管理・お出かけスポット記録などの機能を提供するハブアプリケーションです。このリポジトリはバックエンド API の実装です。

## 目次

- [クイックスタート](#クイックスタート)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [デモデータのセットアップ](#デモデータのセットアップ)
- [API 操作ガイド](#api-操作ガイド)
- [コード品質管理](#コード品質管理)
- [開発者コマンド一覧](#開発者コマンド一覧)

## クイックスタート

```bash
# リポジトリをクローン
git clone https://github.com/your-username/family-hub-web.git
cd family-hub-web/backend

# .envファイルを作成
cp .env.example .env

# Docker Composeでビルドと起動
docker compose up -d --build

# データベースマイグレーション実行
docker compose exec api alembic upgrade head

# デモデータをセットアップ
docker compose exec api python setup_demo.py

# ブラウザで API ドキュメントを開く
# http://localhost:8000/api/v1/docs
```

## 開発環境のセットアップ

### 前提条件

- Docker と Docker Compose がインストールされていること
- Python 3.11 以上がインストールされていること（ローカル開発の場合）

### Docker を使った環境構築（推奨）

1. リポジトリをクローン:

```bash
git clone https://github.com/your-username/family-hub-web.git
cd family-hub-web/backend
```

2. .env ファイルを作成:

```bash
cp .env.example .env
# 必要に応じて .env を編集
```

3. Docker Compose でビルドと起動:

```bash
docker compose up -d --build
```

4. データベースのマイグレーション:

```bash
docker compose exec api alembic upgrade head
```

5. API ドキュメントへのアクセス:

- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

### 環境変数の設定

`.env.example` をコピーして `.env` ファイルを作成し、必要に応じて以下の環境変数を編集します。

```
# データベース接続設定
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/syncfam

# JWT設定
SECRET_KEY=supersecretkey  # 必ず本番環境では変更してください
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# デバッグモード
DEBUG=True  # 本番環境ではFalseに設定
```

### ローカル開発環境のセットアップ（Docker なしの場合）

1. 仮想環境の作成と有効化:

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. 依存関係のインストール:

```bash
pip install -r requirements.txt
```

3. アプリケーションの起動:

```bash
uvicorn app.main:app --reload
```

## デモデータのセットアップ

開発やテストを容易にするために、デモデータをセットアップすることができます。

### デモデータのセットアップ方法

1. **Swagger UI を使用する場合**:

   - http://localhost:8000/api/v1/docs にアクセス
   - 「development」タグの下にある `/api/v1/setup-demo` エンドポイントを開く
   - 「Try it out」ボタンをクリック
   - 「Execute」ボタンをクリックしてデモデータをセットアップ

2. **コマンドラインを使用する場合**:

   ```bash
   # Makefileを使用する場合
   make setup-demo

   # または直接コマンドを実行する場合
   docker compose exec api python setup_demo.py
   ```

### デモユーザーアカウント

デモデータをセットアップすると、以下のユーザーアカウントが作成されます：

- **田中太郎**: dad@example.com / password123
- **田中花子**: mom@example.com / password123
- **佐藤一郎**: grandpa@example.com / password123

## API 操作ガイド

### Swagger UI での操作手順

Swagger UI で API を操作する際の基本的な手順：

1. http://localhost:8000/api/v1/docs にアクセス

2. **デモデータのセットアップ** (まだ実行していない場合):
   - 「development」タグの下にある `/api/v1/setup-demo` エンドポイントを開く
   - 「Try it out」ボタンをクリック
   - 「Execute」ボタンをクリックしてデモデータをセットアップ

3. **ログイン認証**:
   - 「auth」タグの下にある `/api/v1/auth/login` エンドポイントを開く
   - 「Try it out」ボタンをクリック
   - リクエストボディにデモアカウントの認証情報を入力:
     ```
     username: dad@example.com
     password: password123
     ```
   - 「Execute」ボタンをクリック
   - レスポンスからアクセストークンをコピー

4. **認証の設定**:
   - Swagger UI の右上にある「Authorize」ボタンをクリック
   - 「Bearer」の欄に先ほどコピーしたアクセストークンを貼り付け (先頭に `Bearer ` は不要)
   - 「Authorize」ボタンをクリック

5. **API の操作**:
   - 各エンドポイントを開いて「Try it out」ボタンをクリック
   - 必要なパラメータを入力してリクエストを送信

### CLI からの API 操作例

コマンドラインから API を操作する例：

1. **トークンの取得**:

```bash
curl -X 'POST' \
  'http://localhost:8000/api/v1/auth/login' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'username=dad@example.com&password=password123'
```

2. **家族一覧の取得**:

```bash
curl -X 'GET' \
  'http://localhost:8000/api/v1/families' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

3. **新しいタスクの作成**:

```bash
curl -X 'POST' \
  'http://localhost:8000/api/v1/tasks' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
  "title": "買い物に行く",
  "description": "牛乳と卵を買う",
  "family_id": "YOUR_FAMILY_ID",
  "status": "pending",
  "priority": "medium",
  "is_routine": false
}'
```

## データベースの確認

1. データベースコンテナに接続:

```bash
docker compose exec db psql -U postgres -d syncfam
```

2. 接続後の主なコマンド:

```sql
-- テーブル一覧の表示
\dt

-- テーブルの詳細情報を確認
\d+ users

-- ユーザーテーブルの内容確認
SELECT * FROM users;

-- 家族テーブルの内容確認
SELECT * FROM families;

-- タスクテーブルの内容確認
SELECT * FROM tasks;

-- データベース終了
\q
```

## コード品質管理

### フォーマットとリント

コードの品質を維持するため、以下のコマンドを使用してください。

#### Makefile を使用する場合 (推奨)

```bash
# コードフォーマット（自動修正）
make format

# コードフォーマット（チェックのみ）
make format-check

# リント（自動修正）
make lint

# リント（チェックのみ）
make lint-check

# 一括実行（チェックのみ）
make quality-check
```

#### Docker Compose コマンドを直接使用する場合

```bash
# コードフォーマット（自動修正）
docker compose exec api ruff format ./app

# コードフォーマット（チェックのみ）
docker compose exec api ruff format ./app --check

# リント（自動修正）
docker compose exec api ruff check ./app --fix

# リント（チェックのみ）
docker compose exec api ruff check ./app
```

### テスト実行

#### Makefile を使用する場合 (推奨)

```bash
# すべてのテストを実行
make test
```

#### Docker Compose コマンドを直接使用する場合

```bash
# すべてのテストを実行
docker compose exec -e TESTING=True api pytest

# 特定のテストファイルを実行
docker compose exec -e TESTING=True api pytest tests/test_tasks.py

# テストカバレッジレポートの生成
docker compose exec -e TESTING=True api pytest --cov=app
```

## 開発者コマンド一覧

以下は、開発作業で頻繁に使用するコマンドの一覧です。

### アプリケーション操作

```bash
# アプリケーションを起動
docker compose up -d

# アプリケーションを停止
docker compose down

# アプリケーションのビルド
docker compose build

# ログの確認
docker compose logs -f

# デモデータのセットアップ
docker compose exec api python setup_demo.py
# または
make setup-demo
```

### データベース操作

```bash
# マイグレーションの作成
docker compose exec api alembic revision --autogenerate -m "説明"

# マイグレーションの適用
docker compose exec api alembic upgrade head

# マイグレーションを1つ戻す
docker compose exec api alembic downgrade -1

# 特定のリビジョンにダウングレード
docker compose exec api alembic downgrade <revision>
```

### コードベース管理

```bash
# 依存関係の更新
docker compose exec api pip install -r requirements.txt

# 新しい依存関係の追加
docker compose exec api pip install <package> && \
docker compose exec api pip freeze > requirements.txt
```

### テンプレート

#### 新しいモデルのテンプレート

```python
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

class NewModel(Base):
    __tablename__ = "new_models"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # リレーションシップの例
    family_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("families.id", ondelete="CASCADE")
    )
    family: Mapped["Family"] = relationship("Family", back_populates="new_models")
```

#### 新しいスキーマのテンプレート

```python
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

# ベーススキーマ
class NewModelBase(BaseModel):
    name: str

# 作成リクエスト用スキーマ
class NewModelCreate(NewModelBase):
    family_id: uuid.UUID

# 更新リクエスト用スキーマ
class NewModelUpdate(BaseModel):
    name: Optional[str] = None

# レスポンス用スキーマ
class NewModelResponse(NewModelBase):
    id: uuid.UUID
    family_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

#### 新しいCRUD関数のテンプレート

```python
import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.new_model import NewModel
from app.schemas.new_model import NewModelCreate, NewModelUpdate

class CRUDNewModel(CRUDBase[NewModel, NewModelCreate, NewModelUpdate]):
    async def get_by_family(
        self, db: AsyncSession, *, family_id: uuid.UUID
    ) -> List[NewModel]:
        stmt = select(NewModel).where(NewModel.family_id == family_id)
        result = await db.execute(stmt)
        return result.scalars().all()

new_model = CRUDNewModel(NewModel)

# シンプルな関数インターフェースも提供
async def get_new_models_by_family(db: AsyncSession, family_id: uuid.UUID) -> List[NewModel]:
    return await new_model.get_by_family(db, family_id=family_id)
```

#### 新しいサービス関数のテンプレート

```python
import uuid
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.family import is_user_family_member
from app.crud.new_model import get_new_models_by_family, new_model
from app.models.new_model import NewModel
from app.schemas.new_model import NewModelCreate, NewModelUpdate

async def check_family_membership(
    db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID
) -> bool:
    """
    ユーザーが家族のメンバーかどうかを確認
    """
    is_member = await is_user_family_member(db, user_id, family_id)
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この家族のリソースにアクセスする権限がありません",
        )
    return True

async def create_new_model_for_family(
    db: AsyncSession, model_in: NewModelCreate, user_id: uuid.UUID
) -> NewModel:
    """
    家族用の新しいモデルを作成
    """
    # ユーザーが家族のメンバーであることを確認
    await check_family_membership(db, user_id, model_in.family_id)

    # 新しいモデルを作成
    return await new_model.create(db, obj_in=model_in)
```

#### 新しいルーターのテンプレート

```python
import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import Response
from app.schemas.new_model import NewModelCreate, NewModelResponse, NewModelUpdate
from app.services.new_model import (
    create_new_model_for_family, 
    get_new_models_for_family,
)

router = APIRouter()

@router.post(
    "", response_model=Response[NewModelResponse], status_code=status.HTTP_201_CREATED
)
async def create_new_model(
    model_in: NewModelCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    新しいモデルを作成
    """
    model = await create_new_model_for_family(db, model_in, current_user.id)
    return Response(data=model, message="モデルを作成しました")

@router.get(
    "/family/{family_id}", response_model=Response[List[NewModelResponse]]
)
async def read_new_models(
    family_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    特定の家族のモデル一覧を取得
    """
    models = await get_new_models_for_family(db, current_user.id, family_id)
    return Response(data=models, message="モデル一覧を取得しました")
```
