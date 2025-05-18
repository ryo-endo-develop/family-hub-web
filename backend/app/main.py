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
    # データベース接続を初期化
    try:
        from app.db.session import init_engine
        
        print("データベース接続を初期化しています...")
        await init_engine()
        print("データベース接続の初期化が完了しました")
    except Exception as e:
        print(f"データベース接続の初期化中にエラーが発生しました: {e}")
        raise  # データベースが使用できない場合はアプリを起動しない
        
    # ログ設定を初期化
    try:
        from app.utils.logging_utils import setup_logging
        log_level = logging.DEBUG if settings.DEBUG else logging.INFO
        setup_logging(level=log_level)
        print("\u30edグシステムを初期化しました")
    except Exception as e:
        print(f"\u30edグ設定の初期化エラー: {e}")
    
    # ルーティンタスクのリセット処理を実行
    try:
        from app.services.routine_task import reset_completed_routine_tasks
        
        # DB接続を開始
        async with SessionLocal() as db:
            reset_count = await reset_completed_routine_tasks(db)
            print(f"起動時に {reset_count} 件のルーティンタスクをリセットしました")
    except Exception as e:
        print(f"ルーティンタスクのリセット中にエラーが発生しました: {e}")


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
