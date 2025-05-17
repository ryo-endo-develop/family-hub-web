# SyncFam バックエンド設計ドキュメント

## 概要

SyncFam は家族向けのタスク管理・スケジュール調整・献立管理・お出かけスポット記録などの機能を提供するハブアプリケーションです。本ドキュメントではバックエンドシステムの設計について説明します。

## アーキテクチャ方針

### 基本アーキテクチャ

本バックエンドは、関心事の分離を目的とした**レイヤードアーキテクチャ**を採用します。主なレイヤーとその責務は以下の通りです。

1.  **API レイヤー (`app/routers/`)**:

    - HTTP リクエストの受付、パスパラメータ・クエリパラメータの解釈。
    - リクエストボディのバリデーション（`schemas`を利用）。
    - Service レイヤーの呼び出し。
    - Service レイヤーからの結果を HTTP レスポンス（`schemas`を利用）に整形して返却。
    - HTTP レベルのエラーハンドリング（例: 404 Not Found）。
    - 依存性注入（DB セッションなど）の解決。
    - **責務:** HTTP 通信に関わる処理に限定し、「薄く」保つ。

2.  **Service レイヤー (`app/services/`)**:

    - アプリケーション固有のビジネスロジック、ユースケースの実装。
    - 複数の CRUD 操作のオーケストレーション。
    - 複雑なデータ加工や計算。
    - 必要に応じたトランザクション境界の管理（複数ステップにまたがる操作など）。
    - **責務:** アプリケーションの「何をするか」を定義する中心的な層。

3.  **CRUD レイヤー (`app/crud/`)**:

    - データベースに対する基本的な永続化操作（Create, Read, Update, Delete）。
    - SQLAlchemy と DB セッションを利用したデータアクセス。
    - スキーマオブジェクトと DB モデルオブジェクト間の変換。
    - **責務:** 特定のモデルに対する DB 操作をカプセル化。ビジネスロジックは原則として含まない。

4.  **モデルレイヤー (`app/models/`)**:

    - データベースのテーブル構造、カラム、リレーションシップを SQLAlchemy クラスで定義。
    - **責務:** アプリケーションが扱うデータの構造を定義。

5.  **スキーマレイヤー (`app/schemas/`)**:

    - API のインターフェース（リクエスト/レスポンス）で利用するデータの形式、バリデーションルールを Pydantic クラスで定義。
    - **責務:** API のデータコントラクトを定義。

6.  **インフラストラクチャレイヤー (`app/db/`, `app/core/`, etc.)**:
    - データベース接続、設定管理、外部サービス連携など。

### ビジネスロジックの実装場所

複雑なビジネスロジックは、API レイヤー(`routers`)や CRUD レイヤーには実装せず、**Service レイヤー(`services`)に実装**します。

### トランザクション管理

データベーストランザクションは、FastAPI の依存性注入で提供されるリクエスト単位の DB セッション内で管理されます。複数の DB 操作を伴う一連の処理（ユースケース）については、**Service レイヤーでトランザクションの開始・コミット・ロールバックを制御**することを基本方針とします。（単純な CRUD は CRUD 層でコミットする場合もあります）

## ディレクトリ構成

このバックエンドアプリケーションは、関心事の分離を目的として以下のディレクトリ構成を採用しています。

```
├── app/                   # メインのアプリケーションコード
│   ├── __init__.py
│   ├── main.py            # FastAPI App Entrypoint
│   ├── core/              # コア設定・共通関数
│   │   ├── __init__.py
│   │   ├── config.py      # 設定管理
│   │   ├── security.py    # JWT認証など
│   │   └── deps.py        # 依存性注入の定義
│   ├── db/                # DB接続・セッション管理
│   │   ├── __init__.py
│   │   └── session.py     # DBセッション
│   ├── models/            # DBモデル定義 (SQLAlchemy)
│   │   ├── __init__.py
│   │   ├── user.py        # ユーザーモデル
│   │   ├── family.py      # 家族モデル
│   │   └── task.py        # タスクモデル
│   ├── schemas/           # APIスキーマ定義 (Pydantic)
│   │   ├── __init__.py
│   │   ├── user.py        # ユーザースキーマ
│   │   ├── family.py      # 家族スキーマ
│   │   └── task.py        # タスクスキーマ
│   ├── crud/              # CRUD操作関数
│   │   ├── __init__.py
│   │   ├── base.py        # 基本CRUD操作
│   │   ├── user.py        # ユーザーCRUD
│   │   ├── family.py      # 家族CRUD
│   │   └── task.py        # タスクCRUD
│   ├── services/          # ビジネスロジック
│   │   ├── __init__.py
│   │   ├── user.py        # ユーザー関連ビジネスロジック
│   │   ├── family.py      # 家族関連ビジネスロジック
│   │   └── task.py        # タスク関連ビジネスロジック
│   └── routers/           # APIエンドポイント(ルーティング)定義
│       ├── __init__.py
│       ├── api.py         # API全体のルーター
│       ├── auth.py        # 認証ルーター
│       ├── users.py       # ユーザールーター
│       ├── families.py    # 家族ルーター
│       └── tasks.py       # タスクルーター
├── tests/                 # テストコード
│   ├── __init__.py
│   ├── conftest.py        # pytestの共通設定・フィクスチャ
│   ├── test_api.py        # API全体のテスト
│   ├── test_auth.py       # 認証のテスト
│   └── test_tasks.py      # タスク機能のテスト
├── alembic/               # データベースマイグレーション
├── .env                   # 環境変数 (Git管理外)
├── .env.example           # 環境変数サンプル
├── .gitignore             # Git無視リスト
├── Dockerfile             # FastAPIアプリ用Dockerfile
├── docker-compose.yml     # Docker Compose設定
├── pyproject.toml         # プロジェクト設定
└── requirements.txt       # Python依存ライブラリ
```

## テクノロジースタック

- **Web Framework**: FastAPI
- **ORM**: SQLAlchemy
- **バリデーション**: Pydantic
- **DB**: PostgreSQL
- **認証**: JWT (JSON Web Tokens)
- **ドキュメント**: OpenAPI/Swagger (FastAPI 組み込み)
- **コンテナ化**: Docker & Docker Compose
- **テスト**: pytest

## データモデル

### 主要エンティティ

#### ユーザー (User)

```python
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

#### 家族 (Family)

```python
class Family(Base):
    __tablename__ = "families"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

#### 家族メンバー (FamilyMember)

```python
class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    family_id = Column(UUID(as_uuid=True), ForeignKey("families.id"), nullable=False)
    role = Column(String, nullable=False)  # 'parent', 'child', 'other'
    is_admin = Column(Boolean, default=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="family_memberships")
    family = relationship("Family", back_populates="members")

    __table_args__ = (UniqueConstraint('user_id', 'family_id', name='uq_user_family'),)
```

#### タスク (Task)

```python
class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    family_id = Column(UUID(as_uuid=True), ForeignKey("families.id"), nullable=False)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    due_date = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending, in_progress, completed
    priority = Column(String, nullable=False, default="medium")  # low, medium, high
    is_routine = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    family = relationship("Family", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_tasks")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="created_tasks")
    tags = relationship("Tag", secondary="task_tags", back_populates="tasks")
```

#### タグ (Tag)

```python
class Tag(Base):
    __tablename__ = "tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    color = Column(String, nullable=True)
    family_id = Column(UUID(as_uuid=True), ForeignKey("families.id"), nullable=False)

    family = relationship("Family", back_populates="tags")
    tasks = relationship("Task", secondary="task_tags", back_populates="tags")

    __table_args__ = (UniqueConstraint('name', 'family_id', name='uq_tag_name_family'),)
```

#### タスクとタグの関連付け (TaskTag)

```python
class TaskTag(Base):
    __tablename__ = "task_tags"

    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), primary_key=True)
    tag_id = Column(UUID(as_uuid=True), ForeignKey("tags.id"), primary_key=True)
```

## API エンドポイント設計

### ベース URL

```
/api/v1
```

## 認証と認可

### 認証方式

JWT (JSON Web Token) を使用したトークンベースの認証を採用します。ユーザーはログイン時に JWT トークンを取得し、以降の API リクエストには`Authorization: Bearer <token>`ヘッダーを付与します。

### 認可ポリシー

- 各リソース（タスク、家族など）には所有者（家族）が設定されます。
- ユーザーは自分が所属する家族のリソースのみにアクセスできます。
- 管理者権限を持つ家族メンバーのみが、家族設定の変更や家族メンバーの追加・削除を行えます。

## セキュリティ対策

- パスワードは bcrypt でハッシュ化して保存
- JWT トークンの有効期限設定
- CORS (Cross-Origin Resource Sharing) の適切な設定
- HTTPS の使用（本番環境）
- 入力バリデーションの徹底（Pydantic による型チェックとバリデーション）
- SQL インジェクション対策（SQLAlchemy のパラメータ化クエリ）

## エラーハンドリング

FastAPI の例外ハンドリング機能を使用し、適切な HTTP ステータスコードとエラーメッセージを返します。

主なエラーパターン:

- 400 Bad Request - 不正なリクエスト形式
- 401 Unauthorized - 認証失敗
- 403 Forbidden - 権限不足
- 404 Not Found - リソースが存在しない
- 422 Unprocessable Entity - バリデーションエラー
- 500 Internal Server Error - サーバー内部エラー

## パフォーマンス最適化

- データベースインデックスの適切な設定
- N+1 問題の回避（SQLAlchemy の join_loaded 使用）
- キャッシュの検討（将来的に）

## デプロイメント

- Docker & Docker Compose を使用したコンテナ化
- CI/CD パイプラインの構築（将来的に）

## マイグレーション戦略

Alembic を使用したデータベースマイグレーション管理を行います。

## テスト戦略

pytest を使用し、以下のレベルのテストを実施します:

1. 単体テスト: 個々の関数やクラスの動作確認
2. 統合テスト: API エンドポイントの動作確認
3. エンドツーエンドテスト: 実際のユースケースを模擬したテスト

テスト環境では、本番環境と同等の PostgreSQL データベースを使用しますが、テストごとにテーブルをクリーンアップして再作成します。

## ロギング

Python 標準の logging モジュールを使用し、適切なログレベル（DEBUG, INFO, WARNING, ERROR, CRITICAL）でログを出力します。本番環境では JSON 形式でのログ出力を検討します。

## モニタリング

将来的に以下の実装を検討:

- Prometheus を使用したメトリクス収集
- Grafana を使用したダッシュボード
- Sentry を使用した例外監視

## 拡張性と将来計画

- フロントエンドとの連携（React 等）
- リアルタイム通知機能（WebSockets や SSE）
- カレンダー・献立管理・お出かけスポット関連の機能追加
