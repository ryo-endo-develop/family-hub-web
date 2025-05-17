from typing import Optional

from pydantic import BaseModel, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str

    model_config = ConfigDict(populate_by_name=True)


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

    model_config = ConfigDict(populate_by_name=True)
