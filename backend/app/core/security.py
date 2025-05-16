import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(
    schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12, bcrypt__ident="2b"
)


def create_access_token(
    subject: str | Any, expires_delta: Optional[timedelta] = None
) -> str:
    """
    JWTアクセストークンを生成します
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_refresh_token() -> str:
    """
    安全なリフレッシュトークンを生成します
    """
    # セキュアな乱数を生成（64バイト = 128文字の16進数文字列）
    return secrets.token_hex(64)


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    アクセストークンをデコードして検証します
    """
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    if payload.get("type") != "access":
        raise ValueError("Invalid token type")
    return payload


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    平文のパスワードとハッシュされたパスワードが一致するか検証します
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    パスワードをハッシュ化します
    """
    return pwd_context.hash(password)
