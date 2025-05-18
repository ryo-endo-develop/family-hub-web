# SyncFam バックエンド設計ドキュメント

## 概要

SyncFam は家族向けのタスク管理・スケジュール調整・献立管理・お出かけスポット記録などの機能を提供するハブアプリケーションです。本ドキュメントではバックエンドシステムの設計と実装状況について説明します。

## 実装状況の概要

| 機能                 | 状態        | 備考                                          |
| -------------------- | ----------- | --------------------------------------------- |
| 基本インフラ環境構築 | ✅ 完了     | FastAPI, SQLAlchemy, PostgreSQL, Docker, Ruff |
| ユーザー管理         | ✅ 完了     | 登録、認証（JWT）、プロフィール               |
| 家族管理             | ✅ 完了     | 作成、メンバー追加、権限管理                  |
| タスク管理           | ✅ 完了     | 作成、一覧、詳細、更新、削除、タグ管理        |
| サブタスク管理       | ✅ 完了     | 親タスクの下に子タスクを作成、ツリー表示      |
| カレンダー管理       | 🔄 未実装   | 今後の実装予定                                |
| 献立管理             | 🔄 未実装   | 今後の実装予定                                |
| お出かけスポット     | 🔄 未実装   | 今後の実装予定                                |
| テスト               | ⚠️ 一部実装 | 基本的なテスト構造はあるが拡充が必要          |

## アーキテクチャ方針

本バックエンドは、関心事の分離を目的とした**レイヤードアーキテクチャ**を採用しています。主なレイヤーとその責務は以下の通りです。

1.  **API レイヤー (`app/routers/`)**:

    - HTTP リクエストの受付、パスパラメータ・クエリパラメータの解釈
    - リクエストボディのバリデーション（`schemas`を利用）
    - Service レイヤーの呼び出し
    - Service レイヤーからの結果を HTTP レスポンス（`schemas`を利用）に整形して返却
    - HTTP レベルのエラーハンドリング（例: 404 Not Found）
    - 依存性注入（DB セッションなど）の解決
    - **責務:** HTTP 通信に関わる処理に限定し、「薄く」保つ

2.  **Service レイヤー (`app/services/`)**:

    - アプリケーション固有のビジネスロジック、ユースケースの実装
    - 複数の CRUD 操作のオーケストレーション
    - 複雑なデータ加工や計算
    - 必要に応じたトランザクション境界の管理（複数ステップにまたがる操作など）
    - **責務:** アプリケーションの「何をするか」を定義する中心的な層

3.  **CRUD レイヤー (`app/crud/`)**:

    - データベースに対する基本的な永続化操作（Create, Read, Update, Delete）
    - SQLAlchemy と DB セッションを利用したデータアクセス
    - スキーマオブジェクトと DB モデルオブジェクト間の変換
    - **責務:** 特定のモデルに対する DB 操作をカプセル化。ビジネスロジックは原則として含まない

4.  **モデルレイヤー (`app/models/`)**:

    - データベースのテーブル構造、カラム、リレーションシップを SQLAlchemy クラスで定義
    - **責務:** アプリケーションが扱うデータの構造を定義

5.  **スキーマレイヤー (`app/schemas/`)**:

    - API のインターフェース（リクエスト/レスポンス）で利用するデータの形式、バリデーションルールを Pydantic クラスで定義
    - **責務:** API のデータコントラクトを定義

6.  **インフラストラクチャレイヤー (`app/db/`, `app/core/`, etc.)**:
    - データベース接続、設定管理、外部サービス連携など
    - **責務:** アプリケーション基盤の提供

### 技術的負債を抑えるための原則

開発速度を優先しつつも技術的負債を抑えるため、以下の原則を守りましょう：

1. **明確な責務分離**: 各レイヤーの責務を明確に分ける
2. **適切なドキュメント化**: コード内のコメントと本ドキュメントの更新
3. **コード品質の維持**: `ruff`によるフォーマットとリント
4. **テストカバレッジ**: 主要機能のテスト作成
5. **段階的リファクタリング**: 必要に応じて小さな範囲でリファクタリング

## データモデル

### 主要エンティティ

#### ユーザー (User)

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    first_name: Mapped[str] = mapped_column(String)
    last_name: Mapped[str] = mapped_column(String)
    avatar_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # リレーションシップ
    family_memberships: Mapped[List["FamilyMember"]] = relationship(
        "FamilyMember", back_populates="user", cascade="all, delete-orphan"
    )
    assigned_tasks: Mapped[List["Task"]] = relationship(
        "Task", foreign_keys="Task.assignee_id", back_populates="assignee"
    )
    created_tasks: Mapped[List["Task"]] = relationship(
        "Task", foreign_keys="Task.created_by_id", back_populates="created_by"
    )
```

#### 家族 (Family)

```python
class Family(Base):
    __tablename__ = "families"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # リレーションシップ
    members: Mapped[List["FamilyMember"]] = relationship(
        back_populates="family", cascade="all, delete-orphan"
    )
    tasks: Mapped[List["Task"]] = relationship(
        "Task", back_populates="family", cascade="all, delete-orphan"
    )
    tags: Mapped[List["Tag"]] = relationship(
        "Tag", back_populates="family", cascade="all, delete-orphan"
    )
```

#### 家族メンバー (FamilyMember)

```python
class FamilyMember(Base):
    __tablename__ = "family_members"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    family_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("families.id", ondelete="CASCADE")
    )
    role: Mapped[str] = mapped_column(String)  # 'parent', 'child', 'other'
    is_admin: Mapped[bool] = mapped_column(default=False)
    joined_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # リレーションシップ
    user: Mapped["User"] = relationship("User", back_populates="family_memberships")
    family: Mapped[Family] = relationship(Family, back_populates="members")

    __table_args__ = (UniqueConstraint("user_id", "family_id", name="uq_user_family"),)
```

#### タスク (Task)

```python
class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    family_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("families.id", ondelete="CASCADE")
    )
    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    due_date: Mapped[Optional[date]] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(
        String, default="pending"
    )  # pending, in_progress, completed
    priority: Mapped[str] = mapped_column(String, default="medium")  # low, medium, high
    is_routine: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # サブタスク機能のための追加フィールド
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True
    )

    # リレーションシップ
    family: Mapped["Family"] = relationship("Family", back_populates="tasks", lazy="selectin")
    assignee: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[assignee_id], back_populates="assigned_tasks", lazy="selectin"
    )
    created_by: Mapped["User"] = relationship(
        "User", foreign_keys=[created_by_id], back_populates="created_tasks", lazy="selectin"
    )
    tags: Mapped[List["Tag"]] = relationship(
        secondary=task_tags,
        back_populates="tasks",
        lazy="selectin",
    )

    # サブタスク関連のリレーションシップ
    parent: Mapped[Optional["Task"]] = relationship(
        "Task", remote_side=[id], back_populates="subtasks", foreign_keys=[parent_id]
    )
    subtasks: Mapped[List["Task"]] = relationship(
        "Task",
        back_populates="parent",
        cascade="all, delete-orphan",
        foreign_keys=[parent_id],
        lazy="selectin",
    )
```

#### タグ (Tag)

```python
class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String)
    color: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    family_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("families.id", ondelete="CASCADE")
    )

    # リレーションシップ
    family: Mapped["Family"] = relationship("Family", back_populates="tags", lazy="selectin")
    tasks: Mapped[List[Task]] = relationship(
        secondary=task_tags,
        back_populates="tags",
        lazy="selectin",
    )

    __table_args__ = (UniqueConstraint("name", "family_id", name="uq_tag_name_family"),)
```

## API エンドポイント

### 認証関連

- `POST /api/v1/auth/register` - ユーザー登録
- `POST /api/v1/auth/login` - ログイン（JWTトークン取得）
- `POST /api/v1/auth/refresh` - トークン更新
- `GET /api/v1/auth/me` - 現在のユーザー情報取得

### ユーザー関連

- `GET /api/v1/users/me` - 自分のプロフィール取得
- `PUT /api/v1/users/me` - 自分のプロフィール更新

### 家族関連

- `POST /api/v1/families` - 家族作成
- `GET /api/v1/families` - 自分が所属する家族一覧取得
- `GET /api/v1/families/{family_id}` - 家族詳細取得
- `PUT /api/v1/families/{family_id}` - 家族情報更新
- `POST /api/v1/families/{family_id}/members` - 家族メンバー追加
- `GET /api/v1/families/{family_id}/members` - 家族メンバー一覧取得
- `DELETE /api/v1/families/{family_id}/members/{user_id}` - 家族メンバー削除

### タスク関連

- `POST /api/v1/tasks` - タスク作成
- `GET /api/v1/tasks` - タスク一覧取得（クエリパラメータでフィルタリング可能）
- `GET /api/v1/tasks/roots` - ルートタスク一覧取得（サブタスクも含む）
- `GET /api/v1/tasks/{task_id}` - タスク詳細取得
- `GET /api/v1/tasks/with-subtasks/{task_id}` - サブタスクを含むタスク詳細取得
- `POST /api/v1/tasks/{task_id}/subtasks` - サブタスク作成
- `PUT /api/v1/tasks/{task_id}` - タスク更新
- `DELETE /api/v1/tasks/{task_id}` - タスク削除

### タグ関連

- `POST /api/v1/tags` - タグ作成
- `GET /api/v1/tags/family/{family_id}` - 特定の家族のタグ一覧取得
- `PUT /api/v1/tags/{tag_id}` - タグ更新
- `DELETE /api/v1/tags/{tag_id}` - タグ削除

## 今後の実装計画

### カレンダー管理機能

ワイヤーフレームを参考に、以下の機能を実装する予定です：

1. **データモデル**:

   ```python
   class CalendarEvent(Base):
       __tablename__ = "calendar_events"

       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       title = Column(String, nullable=False)
       description = Column(Text, nullable=True)
       family_id = Column(UUID(as_uuid=True), ForeignKey("families.id"), nullable=False)
       start_time = Column(DateTime, nullable=False)
       end_time = Column(DateTime, nullable=False)
       all_day = Column(Boolean, default=False)
       location = Column(String, nullable=True)
       created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
       assignee_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=True)  # 参加者リスト
       created_at = Column(DateTime, default=datetime.utcnow)
       updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

       # リレーションシップ
       family = relationship("Family", back_populates="events")
       created_by = relationship("User", foreign_keys=[created_by_id])
   ```

2. **API エンドポイント**:
   - `POST /api/v1/events` - イベント作成
   - `GET /api/v1/events` - イベント一覧取得（期間やフィルタ指定可能）
   - `GET /api/v1/events/{event_id}` - イベント詳細取得
   - `PUT /api/v1/events/{event_id}` - イベント更新
   - `DELETE /api/v1/events/{event_id}` - イベント削除

### 献立管理機能

1. **データモデル**:

   ```python
   class MealPlan(Base):
       __tablename__ = "meal_plans"

       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       family_id = Column(UUID(as_uuid=True), ForeignKey("families.id"), nullable=False)
       date = Column(Date, nullable=False)
       meal_type = Column(String, nullable=False)  # breakfast, lunch, dinner
       menu = Column(String, nullable=False)
       note = Column(Text, nullable=True)
       created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
       created_at = Column(DateTime, default=datetime.utcnow)
       updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

       # リレーションシップ
       family = relationship("Family", back_populates="meal_plans")
       created_by = relationship("User", foreign_keys=[created_by_id])

       __table_args__ = (UniqueConstraint('family_id', 'date', 'meal_type', name='uq_family_date_meal'),)
   ```

2. **買い物リスト機能**:

   ```python
   class ShoppingItem(Base):
       __tablename__ = "shopping_items"

       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       family_id = Column(UUID(as_uuid=True), ForeignKey("families.id"), nullable=False)
       name = Column(String, nullable=False)
       quantity = Column(String, nullable=True)
       is_completed = Column(Boolean, default=False)
       note = Column(Text, nullable=True)
       related_meal_id = Column(UUID(as_uuid=True), ForeignKey("meal_plans.id"), nullable=True)
       created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
       created_at = Column(DateTime, default=datetime.utcnow)
       updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

       # リレーションシップ
       family = relationship("Family", back_populates="shopping_items")
       related_meal = relationship("MealPlan", back_populates="shopping_items")
       created_by = relationship("User", foreign_keys=[created_by_id])
   ```

3. **API エンドポイント**:
   - `POST /api/v1/meal-plans` - 献立登録
   - `GET /api/v1/meal-plans` - 献立一覧取得（期間指定可能）
   - `PUT /api/v1/meal-plans/{meal_id}` - 献立更新
   - `DELETE /api/v1/meal-plans/{meal_id}` - 献立削除
   - `POST /api/v1/shopping-items` - 買い物リストアイテム追加
   - `GET /api/v1/shopping-items` - 買い物リスト取得
   - `PUT /api/v1/shopping-items/{item_id}` - 買い物リストアイテム更新
   - `DELETE /api/v1/shopping-items/{item_id}` - 買い物リストアイテム削除

### お出かけスポット管理機能

1. **データモデル**:

   ```python
   class OutingSpot(Base):
       __tablename__ = "outing_spots"

       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       family_id = Column(UUID(as_uuid=True), ForeignKey("families.id"), nullable=False)
       name = Column(String, nullable=False)
       description = Column(Text, nullable=True)
       location = Column(String, nullable=True)
       website = Column(String, nullable=True)
       is_indoor = Column(Boolean, nullable=True)
       is_outdoor = Column(Boolean, nullable=True)
       is_free = Column(Boolean, nullable=True)
       is_rainy_day = Column(Boolean, nullable=True)  # 雨の日OK
       notes = Column(Text, nullable=True)
       created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
       created_at = Column(DateTime, default=datetime.utcnow)
       updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

       # リレーションシップ
       family = relationship("Family", back_populates="outing_spots")
       created_by = relationship("User", foreign_keys=[created_by_id])
       tags = relationship("SpotTag", secondary="spot_tags", back_populates="spots")
   ```

2. **スポットタグ機能**:

   ```python
   class SpotTag(Base):
       __tablename__ = "spot_tags"

       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       name = Column(String, nullable=False)
       color = Column(String, nullable=True)
       family_id = Column(UUID(as_uuid=True), ForeignKey("families.id"), nullable=False)

       # リレーションシップ
       family = relationship("Family", back_populates="spot_tags")
       spots = relationship("OutingSpot", secondary="spot_outing_tags", back_populates="tags")

       __table_args__ = (UniqueConstraint('name', 'family_id', name='uq_spot_tag_name_family'),)
   ```

3. **API エンドポイント**:
   - `POST /api/v1/outing-spots` - お出かけスポット登録
   - `GET /api/v1/outing-spots` - お出かけスポット一覧取得（フィルタリング可能）
   - `GET /api/v1/outing-spots/{spot_id}` - お出かけスポット詳細取得
   - `PUT /api/v1/outing-spots/{spot_id}` - お出かけスポット更新
   - `DELETE /api/v1/outing-spots/{spot_id}` - お出かけスポット削除
   - `POST /api/v1/spot-tags` - スポットタグ作成
   - `GET /api/v1/spot-tags/family/{family_id}` - スポットタグ一覧取得
   - `PUT /api/v1/spot-tags/{tag_id}` - スポットタグ更新
   - `DELETE /api/v1/spot-tags/{tag_id}` - スポットタグ削除

## 認証と認可

### 認証方式

JWT (JSON Web Token) を使用したトークンベースの認証を採用しています。ユーザーはログイン時に JWT トークンを取得し、以降の API リクエストには`Authorization: Bearer <token>`ヘッダーを付与します。

### 認可ポリシー

- 各リソース（タスク、家族など）には所有者（家族）が設定されます。
- ユーザーは自分が所属する家族のリソースのみにアクセスできます。
- 管理者権限を持つ家族メンバーのみが、家族設定の変更や家族メンバーの追加・削除を行えます。

## 非機能要件

### パフォーマンス最適化

- selectinload を使用した関連モデルの先読みによる N+1問題の回避
- 適切なインデックス設定によるクエリ高速化
- ページネーションによる大量データ取得の最適化

### セキュリティ対策

- パスワードはbcryptでハッシュ化して保存
- JWTトークンの有効期限設定
- リフレッシュトークンのローテーション
- CORSの適切な設定
- HTTPSの使用（本番環境）
- 入力バリデーションの徹底（Pydanticによる型チェックとバリデーション）
- SQLインジェクション対策（SQLAlchemyのパラメータ化クエリ）
