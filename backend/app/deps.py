from fastapi import Cookie, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db import get_db
from .models import AuthSession, User
from .security import token_hash

COOKIE = "sid"


class ApiError(Exception):
    """Ошибка API в формате {"error": "код"}, который поймёт интерфейс."""

    def __init__(self, status: int, code: str, **extra):
        self.status = status
        self.code = code
        self.extra = extra


def current_user(
    sid: str | None = Cookie(default=None), db: Session = Depends(get_db)
) -> User:
    """Определяет пользователя ТОЛЬКО по куке сессии."""
    if not sid:
        raise ApiError(401, "unauthorized")

    user = db.scalar(
        select(User)
        .join(AuthSession, AuthSession.user_id == User.id)
        .where(
            AuthSession.token_hash == token_hash(sid),
            AuthSession.expires_at > func.now(),
        )
    )
    if user is None:
        raise ApiError(401, "unauthorized")
    return user

def require_role(*roles: str):
    """Пропускает только пользователей с нужной ролью, иначе 403."""

    def checker(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise ApiError(403, "forbidden")
        return user

    return checker


def student_user(user: User = Depends(current_user)) -> User:
    """Вошедший студент с заполненным профилем."""
    if user.role != "student" or user.student is None:
        raise ApiError(403, "forbidden")
    return user