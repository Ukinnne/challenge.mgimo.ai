from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('student', 'staff')", name="users_role_chk"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    login: Mapped[str] = mapped_column(String(64))
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(16))
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    student: Mapped["StudentProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    staff: Mapped["StaffProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


# Логин уникален без учёта регистра: «Student1» и «student1» считаются одним логином
Index("users_login_uq", func.lower(User.__table__.c.login), unique=True)


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    full_name: Mapped[str] = mapped_column(Text)
    faculty: Mapped[str] = mapped_column(Text)
    program: Mapped[str] = mapped_column(Text)
    course: Mapped[int] = mapped_column(SmallInteger)
    group_name: Mapped[str] = mapped_column(Text)
    record_book: Mapped[str] = mapped_column(Text)

    user: Mapped[User] = relationship(back_populates="student")


class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    full_name: Mapped[str] = mapped_column(Text)
    position: Mapped[str] = mapped_column(Text)

    user: Mapped[User] = relationship(back_populates="staff")

class AuthSession(Base):
    """Сессия входа. В базе лежит только хеш токена, сам токен есть только в куке."""

    __tablename__ = "sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(String(200))