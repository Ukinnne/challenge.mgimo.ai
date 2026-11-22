
from datetime import UTC, datetime, timedelta
from math import ceil

from fastapi import APIRouter, Cookie, Depends, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import COOKIE, ApiError, current_user
from ..models import AuthSession, User
from ..security import DUMMY_HASH, new_token, token_hash, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    login: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("login")
    @classmethod
    def strip_login(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("empty")
        return value


def serialize(user: User) -> dict:
    """Что мы отдаём интерфейсу о пользователе."""
    profile = None

    if user.role == "student" and user.student:
        s = user.student
        profile = {
            "full_name": s.full_name,
            "faculty": s.faculty,
            "program": s.program,
            "course": s.course,
            "group_name": s.group_name,
            "record_book": s.record_book,
        }
    elif user.role == "staff" and user.staff:
        profile = {
            "full_name": user.staff.full_name,
            "position": user.staff.position,
        }

    return {
        "user": {
            "login": user.login,
            "role": user.role,
            "profile": profile,
        }
    }


def create_session(
    db: Session,
    user: User,
    user_agent: str | None,
) -> str:
    """Создаёт новую серверную сессию."""
    db.execute(
        delete(AuthSession).where(
            AuthSession.expires_at < func.now()
        )
    )

    token = new_token()

    db.add(
        AuthSession(
            token_hash=token_hash(token),
            user_id=user.id,
            expires_at=datetime.now(UTC)
            + timedelta(days=settings.session_days),
            user_agent=(user_agent or "")[:200],
        )
    )

    db.commit()
    return token


@router.post("/login")
def login(
    body: LoginIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(User).where(
            func.lower(User.login) == body.login.lower()
        )
    )

    now = datetime.now(UTC)

    if user and user.locked_until and user.locked_until > now:
        minutes = ceil(
            (user.locked_until - now).total_seconds() / 60
        )
        raise ApiError(429, "locked", minutes=minutes)

    ok = verify_password(
        user.password_hash if user else DUMMY_HASH,
        body.password,
    )

    if user is None or not ok:
        if user:
            user.failed_attempts += 1

            if user.failed_attempts >= settings.max_failed_attempts:
                user.locked_until = now + timedelta(
                    minutes=settings.lock_minutes
                )
                user.failed_attempts = 0

            db.commit()

        raise ApiError(401, "invalid_credentials")

    user.failed_attempts = 0
    user.locked_until = None

    token = create_session(
        db,
        user,
        request.headers.get("user-agent"),
    )

    response.set_cookie(
        COOKIE,
        token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.session_days * 86400,
        path="/",
    )

    return serialize(user)


@router.get("/me")
def me(user: User = Depends(current_user)):
    return serialize(user)


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    sid: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if sid:
        db.execute(
            delete(AuthSession).where(
                AuthSession.token_hash == token_hash(sid)
            )
        )
        db.commit()

    response.delete_cookie(COOKIE, path="/")
    response.status_code = 204

    return response
