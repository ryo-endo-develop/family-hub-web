import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse

from app.core.config import settings
from app.db.session import SessionLocal
from app.routers.api import api_router

# セキュリティヘッダーミドルウェア
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        
        # セキュリティ関連のヘッダーを追加
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # 本番環境のみ適用するヘッダー
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; object-src 'none'"
        
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response

# HTTPS強制リダイレクトミドルウェア（本番環境のみ）
class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # 本番環境かつHTTPでのアクセスの場合、HTTPSにリダイレクト
        if not settings.DEBUG and request.url.scheme == "http":
            https_url = str(request.url).replace("http://", "https://", 1)
            return RedirectResponse(https_url, status_code=301)
        return await call_next(request)

# FastAPIアプリケーションの作成
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# 各種ミドルウェアを登録
# HTTPSリダイレクトミドルウェア（最初に登録するのが重要）
if not settings.DEBUG:
    app.add_middleware(HTTPSRedirectMiddleware)

# セキュリティヘッダーミドルウェア
app.add_middleware(SecurityHeadersMiddleware)

# CORSミドルウェアの設定
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )
elif settings.DEBUG:
    # 開発環境でのみすべてのオリジンを許可
    print("警告: 開発モードです。すべてのオリジンが許可されています。")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # 本番環境でCORS設定がない場合は警告
    print("警告: BACKEND_CORS_ORIGINSが設定されていません。クロスオリジンリクエストはすべてブロックされます。")

# APIルーターをアプリケーションに登録
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
async def startup_event():
    """
    アプリケーション起動時の処理
    """
    print("アプリケーション起動処理を開始します...")
    
    # データベース接続を初期化
    try:
        from app.db.session import init_engine, SessionLocal
        
        print("データベース接続を初期化しています...")
        # 有効期限つきの試行
        retry_count = 0
        max_retries = 5
        success = False
        last_error = None
        
        while retry_count < max_retries and not success:
            try:
                await init_engine()
                # 接続テスト
                if SessionLocal is not None:
                    test_db = SessionLocal()
                    try:
                        await test_db.execute("SELECT 1")
                        success = True
                        print(f"データベース接続テスト成功 ({retry_count+1}回目の試行)")
                    except Exception as conn_err:
                        last_error = conn_err
                        print(f"データベース接続テスト失敗: {conn_err}")
                    finally:
                        await test_db.close()
                else:
                    last_error = RuntimeError("SessionLocalが初期化されていません")
            except Exception as init_err:
                last_error = init_err
                print(f"初期化エラー (試行 {retry_count+1}/{max_retries}): {init_err}")
                
            if not success:
                retry_count += 1
                if retry_count < max_retries:
                    wait_time = 2 ** retry_count  # 指数バックオフ (2, 4, 8, 16秒...)
                    print(f"{wait_time}秒待機して再試行します...")
                    import asyncio
                    await asyncio.sleep(wait_time)
        
        if not success:
            print(f"データベース接続の初期化に失敗しました (試行回数: {max_retries}): {last_error}")
            # 警告だけ表示し、アプリケーションは起動させる
            # 最初のリクエスト時にもう一度初期化を試みる
            print("警告: データベースに接続できませんが、アプリケーションは起動を続行します")
        else:
            print("データベース接続の初期化が完了しました")
                
    except Exception as e:
        import traceback
        print(f"データベース接続の初期化中に予期せぬエラーが発生しました: {e}")
        traceback.print_exc()
        # エラーを報告するが、アプリケーションは起動させる
        print("警告: データベースエラーが発生しましたが、アプリケーションは起動を続行します")
        
    # ログ設定を初期化
    try:
        from app.utils.logging_utils import setup_logging
        log_level = logging.DEBUG if settings.DEBUG else logging.INFO
        setup_logging(level=log_level)
        print("\u30edグシステムを初期化しました")
    except Exception as e:
        print(f"\u30edグ設定の初期化エラー: {e}")
    
    # ルーティンタスクのリセット処理はバックグラウンドタスクとして起動後に実行する
    @app.on_event("startup")
    async def reset_routine_tasks_on_startup():
        """
        アプリケーション起動後にルーティンタスクをリセットする
        最初のエンドポイントリクエスト後に実行されるため、データベースの準備が整っている可能性が高い
        """
        # 10秒待機してから実行してみる
        import asyncio
        await asyncio.sleep(10)
        
        try:
            from app.db.session import SessionLocal, init_engine
            from app.services.routine_task import reset_completed_routine_tasks
            
            # データベースの初期化を確認
            if SessionLocal is None:
                print("データベース接続の初期化を実行します")
                await init_engine()
            
            # 再度チェック
            if SessionLocal is not None:
                # DB接続を開始
                db = SessionLocal()
                try:
                    reset_count = await reset_completed_routine_tasks(db)
                    print(f"起動時に {reset_count} 件のルーティンタスクをリセットしました")
                finally:
                    await db.close()
            else:
                print("警告: SessionLocalが初期化されていないため、ルーティンタスクのリセットをスキップします")
        except Exception as e:
            import traceback
            print(f"ルーティンタスクのリセット中にエラーが発生しました: {e}")
            traceback.print_exc()


@app.get("/")
async def root():
    """
    ルートエンドポイント（ヘルスチェック用）
    """
    return {"message": "Welcome to SyncFam API"}


@app.get("/health")
async def health_check():
    """
    ヘルスチェック用エンドポイント
    デプロイ時にサービスの状態確認に使用されます
    """
    return {"status": "ok", "service": "SyncFam API", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
