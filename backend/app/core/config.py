import logging
import os
from typing import List, Optional

from pydantic import AnyHttpUrl, ConfigDict, PostgresDsn, field_validator
from pydantic_settings import BaseSettings

# 環境に応じたログレベルの設定
log_level = (
    logging.DEBUG
    if os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    else logging.INFO
)

logging.basicConfig(
    level=log_level, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.environ.get("SECRET_KEY")
    if not SECRET_KEY:
        raise ValueError(
            "SECRET_KEY環境変数が設定されていません。本番環境では必須です。"
        )
    ALGORITHM: str = "HS256"
    # アクセストークンの有効期限を30分に設定
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    # BACKEND_CORS_ORIGINS is a list of origins that are allowed to make cross-site HTTP requests
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []
    # デバッグモード（デフォルトはFalse）
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")

    # デフォルトタグ設定
    DEFAULT_TAGS: list = [
        {"name": "重要", "color": "#DC3545"},  # 赤系 (テーマの error 色)
        {"name": "買い物", "color": "#F5A623"},  # オレンジ系 (テーマの accent 色)
        {"name": "家事", "color": "#50E3C2"},  # ティール系 (テーマの secondary 色)
        {"name": "育児", "color": "#4A90E2"},  # 青系 (テーマの primary 色)
        {
            "name": "仕事",
            "color": "#6C757D",
        },  # グレー系
        {
            "name": "趣味",
            "color": "#79A6DC",
        },  # 明るめの青
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Optional[List[str]]) -> List[AnyHttpUrl]:
        if isinstance(v, str) and not v.startswith("["):
            return [url.strip() for url in v.split(",")]
        elif isinstance(v, list):
            return v
        else:
            return []

    PROJECT_NAME: str = "SyncFam API"

    DATABASE_URL: Optional[PostgresDsn] = None

    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",  # 未知のフィールドを無視する
    )


settings = Settings()
