import asyncio
import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash
from app.crud.task import create_tag, create_task
from app.db.session import SessionLocal
from app.models.family import Family, FamilyMember
from app.models.token import RefreshToken
from app.models.user import User
from app.schemas.task import TagCreate, TaskCreate


async def truncate_all_tables(db: AsyncSession):
    """全てのテーブルを空にする"""
    # 外部キー制約を一時的に無効化
    await db.execute(text("SET CONSTRAINTS ALL DEFERRED"))

    # データを削除
    await db.execute(
        text(
            "TRUNCATE TABLE users, families, family_members, tasks, tags, task_tags, refresh_tokens RESTART IDENTITY CASCADE"
        )
    )

    # 外部キー制約を再度有効化
    await db.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))

    await db.commit()


async def create_demo_users(db: AsyncSession):
    """デモユーザーを作成"""
    # 固定IDを使用
    fixed_user_ids = [
        uuid.UUID("00000000-0000-0000-0000-000000000001"),  # 田中太郎用
        uuid.UUID("00000000-0000-0000-0000-000000000002"),  # 田中花子用
        uuid.UUID("00000000-0000-0000-0000-000000000003"),  # 佐藤一郎用
    ]

    demo_users = [
        {
            "id": fixed_user_ids[0],
            "email": "dad@example.com",
            "password": "password123",
            "first_name": "太郎",
            "last_name": "田中",
            "avatar_url": "https://randomuser.me/api/portraits/men/1.jpg",
        },
        {
            "id": fixed_user_ids[1],
            "email": "mom@example.com",
            "password": "password123",
            "first_name": "花子",
            "last_name": "田中",
            "avatar_url": "https://randomuser.me/api/portraits/women/1.jpg",
        },
        {
            "id": fixed_user_ids[2],
            "email": "grandpa@example.com",
            "password": "password123",
            "first_name": "一郎",
            "last_name": "佐藤",
            "avatar_url": "https://randomuser.me/api/portraits/men/70.jpg",
        },
    ]

    users = []
    for user_data in demo_users:
        # パスワードをハッシュ化
        password = user_data.pop("password")
        hashed_password = get_password_hash(password)

        # ユーザーを直接作成（固定IDを使用）
        user = User(
            id=user_data["id"],
            email=user_data["email"],
            hashed_password=hashed_password,
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            avatar_url=user_data["avatar_url"],
            is_active=True,
        )
        db.add(user)
        await db.flush()
        users.append(user)

    await db.commit()
    return users


async def create_refresh_tokens(db: AsyncSession, users):
    """デモユーザー用のリフレッシュトークンを作成"""
    refresh_tokens = []

    # 各ユーザーに対してリフレッシュトークンを作成
    for user in users:
        # リフレッシュトークンの有効期限（1週間）
        expires_at = datetime.utcnow() + timedelta(days=7)

        # JWTトークンを生成
        token_str = create_access_token(
            subject=str(user.id), expires_delta=timedelta(days=7)
        )

        # リフレッシュトークンをDBに保存
        refresh_token = RefreshToken(
            token=token_str, user_id=user.id, expires_at=expires_at, is_revoked=False
        )

        db.add(refresh_token)
        refresh_tokens.append(refresh_token)

    await db.commit()
    return refresh_tokens


async def create_demo_families(db: AsyncSession, users):
    """デモ家族を作成"""
    # 固定IDを使用
    fixed_family_ids = [
        uuid.UUID("10000000-0000-0000-0000-000000000001"),  # 田中家用
        uuid.UUID("10000000-0000-0000-0000-000000000002"),  # 佐藤家用
    ]

    demo_families = [
        {"id": fixed_family_ids[0], "name": "田中家"},
        {"id": fixed_family_ids[1], "name": "佐藤家"},
    ]

    families = []
    # 家族を作成
    for family_data in demo_families:
        family = Family(**family_data)
        db.add(family)
        await db.flush()
        families.append(family)

    # 田中家のメンバーシップを作成
    tanaka_family = families[0]

    family_members = [
        FamilyMember(
            user_id=users[0].id,  # 太郎
            family_id=tanaka_family.id,
            role="parent",
            is_admin=True,
        ),
        FamilyMember(
            user_id=users[1].id,  # 花子
            family_id=tanaka_family.id,
            role="parent",
            is_admin=True,
        ),
    ]

    for member in family_members:
        db.add(member)

    # 佐藤家のメンバーシップを作成
    sato_family = families[1]

    db.add(
        FamilyMember(
            user_id=users[2].id,  # 一郎
            family_id=sato_family.id,
            role="parent",
            is_admin=True,
        )
    )

    await db.commit()
    return families


async def create_demo_tags(db: AsyncSession, family_id):
    """デモタグを作成"""
    demo_tags = [
        {"name": "重要", "color": "#FF0000", "family_id": family_id},
        {"name": "買い物", "color": "#00FF00", "family_id": family_id},
        {"name": "家事", "color": "#0000FF", "family_id": family_id},
        {"name": "育児", "color": "#FFFF00", "family_id": family_id},
        {"name": "仕事", "color": "#FF00FF", "family_id": family_id},
        {"name": "趣味", "color": "#00FFFF", "family_id": family_id},
    ]

    tags = []
    for tag_data in demo_tags:
        tag = await create_tag(db, TagCreate(**tag_data))
        tags.append(tag)

    return tags


async def create_demo_tasks(db: AsyncSession, family_id, users, tags):
    """デモタスクを作成"""
    today = date.today()

    demo_tasks = [
        {
            "title": "牛乳を買う",
            "description": "スーパーで牛乳を2本購入する",
            "family_id": family_id,
            "assignee_id": users[0].id,  # 太郎
            "due_date": today + timedelta(days=1),
            "status": "pending",
            "priority": "medium",
            "is_routine": False,
            "tag_ids": [tags[1].id],  # 買い物タグ
        },
        {
            "title": "洗濯物を干す",
            "description": "洗濯機の洗濯物を干す",
            "family_id": family_id,
            "assignee_id": users[1].id,  # 花子
            "due_date": today,
            "status": "completed",
            "priority": "medium",
            "is_routine": True,
            "tag_ids": [tags[2].id],  # 家事タグ
        },
        {
            "title": "保育園の提出書類を準備",
            "description": "保育園に提出する書類を準備する",
            "family_id": family_id,
            "assignee_id": users[1].id,  # 花子
            "due_date": today + timedelta(days=3),
            "status": "pending",
            "priority": "high",
            "is_routine": False,
            "tag_ids": [tags[0].id, tags[3].id],  # 重要タグ、育児タグ
        },
        {
            "title": "ゴミ出し",
            "description": "燃えるゴミを出す",
            "family_id": family_id,
            "assignee_id": users[0].id,  # 太郎
            "due_date": today + timedelta(days=2),
            "status": "pending",
            "priority": "medium",
            "is_routine": True,
            "tag_ids": [tags[2].id],  # 家事タグ
        },
        {
            "title": "会議の準備",
            "description": "明日の会議の資料を準備する",
            "family_id": family_id,
            "assignee_id": users[0].id,  # 太郎
            "due_date": today,
            "status": "in_progress",
            "priority": "high",
            "is_routine": False,
            "tag_ids": [tags[0].id, tags[4].id],  # 重要タグ、仕事タグ
        },
        {
            "title": "子供と公園へ行く",
            "description": "休日に子供と近くの公園へ遊びに行く",
            "family_id": family_id,
            "assignee_id": None,  # 担当者なし
            "due_date": today + timedelta(days=5),
            "status": "pending",
            "priority": "low",
            "is_routine": False,
            "tag_ids": [tags[3].id, tags[5].id],  # 育児タグ、趣味タグ
        },
        {
            "title": "夕食の準備",
            "description": "今日の夕食の材料を用意して調理する",
            "family_id": family_id,
            "assignee_id": users[1].id,  # 花子
            "due_date": today,
            "status": "pending",
            "priority": "medium",
            "is_routine": True,
            "tag_ids": [tags[2].id],  # 家事タグ
        },
        {
            "title": "歯医者の予約",
            "description": "子供の歯医者の予約を取る",
            "family_id": family_id,
            "assignee_id": users[1].id,  # 花子
            "due_date": today + timedelta(days=4),
            "status": "pending",
            "priority": "medium",
            "is_routine": False,
            "tag_ids": [tags[3].id],  # 育児タグ
        },
        {
            "title": "車の点検予約",
            "description": "定期点検の予約を入れる",
            "family_id": family_id,
            "assignee_id": users[0].id,  # 太郎
            "due_date": today + timedelta(days=10),
            "status": "pending",
            "priority": "low",
            "is_routine": False,
            "tag_ids": [],  # タグなし
        },
        {
            "title": "プログラミングの勉強",
            "description": "オンラインコースで1時間勉強する",
            "family_id": family_id,
            "assignee_id": users[0].id,  # 太郎
            "due_date": today + timedelta(days=1),
            "status": "pending",
            "priority": "medium",
            "is_routine": False,
            "tag_ids": [tags[5].id],  # 趣味タグ
        },
    ]

    tasks = []
    for task_data in demo_tasks:
        task_schema = TaskCreate(
            title=task_data["title"],
            description=task_data["description"],
            family_id=task_data["family_id"],
            assignee_id=task_data["assignee_id"],
            due_date=task_data["due_date"],
            status=task_data["status"],
            priority=task_data["priority"],
            is_routine=task_data["is_routine"],
            tag_ids=task_data["tag_ids"],
        )
        task = await create_task(
            db=db,
            task_create=task_schema,
            created_by_id=users[0].id
            if task_data["assignee_id"] == users[0].id
            else users[1].id,
        )
        tasks.append(task)

    return tasks


async def setup_demo_data():
    """デモデータをセットアップする"""
    async with SessionLocal() as db:
        try:
            # テーブルを空にする
            await truncate_all_tables(db)

            # デモユーザーを作成
            users = await create_demo_users(db)
            print(f"✅ {len(users)} ユーザーを作成しました")

            # リフレッシュトークンを作成
            refresh_tokens = await create_refresh_tokens(db, users)
            print(f"✅ {len(refresh_tokens)} リフレッシュトークンを作成しました")

            # デモ家族を作成
            families = await create_demo_families(db, users)
            print(f"✅ {len(families)} 家族を作成しました")

            # 田中家用のデモタグを作成
            if families:  # 家族が作成された場合のみ実行
                tanaka_family = families[0]
                tags = await create_demo_tags(db, tanaka_family.id)
                print(f"✅ {len(tags)} タグを作成しました")

                # 田中家用のデモタスクを作成
                tasks = await create_demo_tasks(db, tanaka_family.id, users, tags)
                print(f"✅ {len(tasks)} タスクを作成しました")
            else:
                print(
                    "⚠️ 家族データが作成されなかったため、タグとタスクの作成をスキップしました。"
                )

            print("✅ デモデータのセットアップが完了しました！")

            # デモアカウント情報の表示
            print("\n===== デモアカウント情報 =====")
            for user in users:
                print(f"📧 メールアドレス: {user.email}")
                print("🔑 パスワード: password123")
                print(f"🆔 ID: {user.id}")
                print("----------------------------")

        except Exception as e:
            print(f"❌ エラーが発生しました: {e}")
            raise


if __name__ == "__main__":
    print("コマンドラインからデモデータセットアップを実行します...")
    # ここでDBが空っぽの場合、このスクリプト単体では失敗します。
    # 先に `alembic upgrade head` を実行しておく必要があります。
    asyncio.run(setup_demo_data())
