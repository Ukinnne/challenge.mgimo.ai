
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    Time,
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
    failed_attempts: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0"
    )
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    student: Mapped["StudentProfile | None"] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    staff: Mapped["StaffProfile | None"] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


Index("users_login_uq", func.lower(User.__table__.c.login), unique=True)


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
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
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    full_name: Mapped[str] = mapped_column(Text)
    position: Mapped[str] = mapped_column(Text)

    user: Mapped[User] = relationship(back_populates="staff")


class AuthSession(Base):
    """Сессия входа. В базе хранится только хеш токена."""

    __tablename__ = "sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(String(200))


class Lesson(Base):
    """Одно занятие группы в конкретный день."""

    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    group_name: Mapped[str] = mapped_column(String(64), index=True)
    lesson_date: Mapped[Date] = mapped_column(Date, index=True)
    start_time: Mapped[Time] = mapped_column(Time)
    end_time: Mapped[Time] = mapped_column(Time)
    subject: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(16))
    teacher: Mapped[str] = mapped_column(Text)
    room: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(16),
        default="normal",
        server_default="normal",
    )
    note: Mapped[str | None] = mapped_column(Text)


class CourseResult(Base):
    """Дисциплина студента."""

    __tablename__ = "course_results"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    term: Mapped[str] = mapped_column(String(64))
    term_order: Mapped[int] = mapped_column(
        SmallInteger,
        default=0,
        server_default="0",
    )
    is_current: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
    )
    subject: Mapped[str] = mapped_column(Text)
    teacher: Mapped[str] = mapped_column(Text)
    control: Mapped[str] = mapped_column(String(8))
    points: Mapped[int | None] = mapped_column(Integer)
    exam_date: Mapped[Date | None] = mapped_column(Date)
    mark: Mapped[str | None] = mapped_column(String(8))


class StudentRequest(Base):
    """Заявка студента в деканат."""

    __tablename__ = "student_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ('new', 'in_progress', 'completed', 'rejected')",
            name="student_requests_status_chk",
        ),
        CheckConstraint(
            "request_type IN ('study_certificate', 'academic_transcript', 'other')",
            name="student_requests_type_chk",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    request_type: Mapped[str] = mapped_column(String(32))
    comment: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(20),
        default="new",
        server_default="new",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    history: Mapped[list["RequestStatusHistory"]] = relationship(
        back_populates="request",
        cascade="all, delete-orphan",
        order_by="RequestStatusHistory.created_at",
    )


class RequestStatusHistory(Base):
    """История изменения статусов заявки."""

    __tablename__ = "request_status_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    request_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("student_requests.id", ondelete="CASCADE"),
        index=True,
    )
    changed_by_user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        index=True,
    )
    actor_role: Mapped[str] = mapped_column(String(16))
    old_status: Mapped[str | None] = mapped_column(String(20))
    new_status: Mapped[str] = mapped_column(String(20))
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    request: Mapped[StudentRequest] = relationship(back_populates="history")


class Announcement(Base):
    """Объявление деканата или учебный дедлайн."""

    __tablename__ = "announcements"
    __table_args__ = (
        CheckConstraint(
            "category IN ('announcement', 'deadline')",
            name="announcements_category_chk",
        ),
        Index("announcements_published_idx", "is_published", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(
        String(20),
        default="announcement",
        server_default="announcement",
    )
    target_group: Mapped[str | None] = mapped_column(String(64), index=True)
    event_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_published: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="true",
    )
    created_by_user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


class Notification(Base):
    """Персональное уведомление пользователя."""

    __tablename__ = "notifications"
    __table_args__ = (
        Index("notifications_user_created_idx", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text)
    notification_type: Mapped[str] = mapped_column(String(32))
    related_request_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("student_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
