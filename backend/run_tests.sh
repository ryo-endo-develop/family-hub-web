#!/bin/bash

# テスト環境変数をセット
export TESTING=True

# 古いテストDBファイルを削除
rm -f /tmp/test.db

# データベーススキーマの初期化スクリプトを実行
python -c "

import asyncio
import os
from app.db.session import engine, Base
from app.models.user import User
from app.models.family import Family
from app.models.task import Task

async def create_tables():
    # 既存のデータベースファイルが存在する場合は削除
    db_path = '/tmp/test.db'
    if os.path.exists(db_path):
        os.unlink(db_path)
        print(f'Removed existing database: {db_path}')
    
    # テーブルを作成
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Test database tables created successfully')
    
asyncio.run(create_tables())
"

# テストを実行
# テストごとに新しいセッションを使用するように設定
python -m pytest "$@" -v
