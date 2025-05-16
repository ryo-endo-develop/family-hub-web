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
| カレンダー管理       | 🔄 未実装   | 今後の実装予定                                |
| 献立管理             | 🔄 未実装   | 今後の実装予定                                |
| お出かけスポット     | 🔄 未実装   | 今後の実装予定                                |
| テスト               | ⚠️ 一部実装 | 基本的なテスト構造はあるが拡充が必要          |

## アーキテクチャ方針

本バックエンドは、関心事の分離を目的とした**レイヤードアーキテクチャ**を採用しています。主なレイヤーとその責務は以下の通りです。

1.  **API レイヤー (`app/routers/`)**:

    - HTTP リクエスト処理、パラメータ解釈、バリデーション、レスポンス整形
    - 責務: HTTP 通信に関わる処理に限定し、「薄く」保つ

2.  **Service レイヤー (`app/services/`)**:

    - ビジネスロジック、複数の CRUD 操作のオーケストレーション
    - 責務: アプリケーションの「何をするか」を定義する中心的な層

3.  **CRUD レイヤー (`app/crud/`)**:

    - データベース操作のカプセル化
    - 責務: 特定のモデルに対する DB 操作の実施

4.  **モデルレイヤー (`app/models/`)**:

    - データベース構造の定義
    - 責務: アプリケーションが扱うデータの構造を定義

5.  **スキーマレイヤー (`app/schemas/`)**:

    - API インターフェースの定義
    - 責務: API のデータコントラクトの定義

6.  **インフラストラクチャレイヤー (`app/db/`, `app/core/`)**:
    - 共通設定、ユーティリティ機能
    - 責務: アプリケーション基盤の提供

### 技術的負債を抑えるための原則

開発速度を優先しつつも技術的負債を抑えるため、以下の原則を守りましょう：

1. **明確な責務分離**: 各レイヤーの責務を明確に分ける
2. **適切なドキュメント化**: コード内のコメントと本ドキュメントの更新
3. **コード品質の維持**: `ruff`によるフォーマットとリント
4. **テストカバレッジ**: 主要機能のテスト作成
5. **段階的リファクタリング**: 必要に応じて小さな範囲でリファクタリング

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

## コード品質管理とテスト

コード品質を維持するため、以下のツールと手順を利用します：

### フォーマットとリント

```bash
# コードフォーマット（自動修正）
docker-compose exec api ruff format ./app

# コードフォーマット（チェックのみ）
docker-compose exec api ruff format ./app --check

# リント（自動修正）
docker-compose exec api ruff check ./app --fix

# リント（チェックのみ）
docker-compose exec api ruff check ./app

# 一括実行（チェックのみ）
docker-compose exec api sh -c "ruff format ./app --check && ruff check ./app"

# 一括実行（自動修正）
docker-compose exec api sh -c "ruff format ./app && ruff check ./app --fix"
```

### テスト実行

```bash
# すべてのテストを実行
docker-compose exec -e TESTING=True api pytest

# 特定のテストファイルを実行
docker-compose exec -e TESTING=True api pytest tests/test_tasks.py

# テストカバレッジレポートの生成
docker-compose exec -e TESTING=True api pytest --cov=app
```

## 開発のポイント

1. **段階的実装**: 各機能は一度に全てを実装するのではなく、最小限の機能から始めて段階的に拡張する
2. **テスト駆動開発**: 新機能実装時はテストから書き始めるとコードの品質が向上する
3. **定期的なリファクタリング**: 新機能追加の前に既存コードの品質を見直す
4. **共通コードの抽出**: 似たような処理は共通化して再利用性を高める

## 課題と留意点

1. **パフォーマンス**: データ量が増えた場合のクエリ最適化が必要
2. **テストカバレッジ**: 現状のテスト実装は不十分なため、拡充が必要
3. **エラーハンドリング**: より詳細なエラーメッセージとロギングの改善
4. **国際化対応**: 将来的に多言語対応の考慮が必要

## まとめ

本ドキュメントは SyncFam バックエンドの設計と実装状況を記述したものです。現状のタスク管理機能は実装済みですが、カレンダー、献立管理、お出かけスポット機能の実装が今後の課題となっています。実装の際は本ドキュメントを参照しながら、コード品質と開発速度のバランスを取りつつ進めてください。
