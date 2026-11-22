
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import ApiError, current_user, require_role
from ..models import (
    Announcement,
    AnnouncementRead,
    Notification,
    StudentProfile,
    User,
)

router = APIRouter(
    prefix="/api/notifications",
    tags=["notifications"],
)


AnnouncementCategory = Literal["announcement", "deadline"]


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    body: str = Field(min_length=1, max_length=5000)
    category: AnnouncementCategory = "announcement"
    target_group: str | None = Field(default=None, max_length=64)
    event_at: datetime | None = None

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Заголовок не может быть пустым")

        return value

    @field_validator("body")
    @classmethod
    def clean_body(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Текст объявления не может быть пустым")

        return value

    @field_validator("target_group")
    @classmethod
    def clean_group(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None


def serialize_announcement(
    item: Announcement,
    is_read: bool | None = None,
) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "body": item.body,
        "category": item.category,
        "target_group": item.target_group,
        "event_at": item.event_at.isoformat() if item.event_at else None,
        "created_at": item.created_at.isoformat(),
        "is_read": is_read,
    }


def serialize_notification(item: Notification) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "body": item.body,
        "notification_type": item.notification_type,
        "related_request_id": item.related_request_id,
        "is_read": item.read_at is not None,
        "read_at": item.read_at.isoformat() if item.read_at else None,
        "created_at": item.created_at.isoformat(),
    }


def visible_announcements_query(user: User, db: Session):
    query = select(Announcement).where(
        Announcement.is_published.is_(True)
    )

    if user.role == "student":
        profile = db.get(StudentProfile, user.id)

        if profile is None:
            query = query.where(Announcement.target_group.is_(None))
        else:
            query = query.where(
                (Announcement.target_group.is_(None))
                | (Announcement.target_group == profile.group_name)
            )

    return query.order_by(Announcement.created_at.desc())


@router.get("")
def get_notifications(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    announcements = db.scalars(
        visible_announcements_query(user, db)
    ).all()

    notifications = db.scalars(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    ).all()

    read_announcement_ids: set[int] = set()

    if user.role == "student":
        read_announcement_ids = set(
            db.scalars(
                select(AnnouncementRead.announcement_id).where(
                    AnnouncementRead.user_id == user.id
                )
            ).all()
        )

    # У сотрудников нет персональных отметок о прочтении общих объявлений.
    # Поэтому их нельзя считать непрочитанными в счётчике сотрудника.
    unread_announcements = (
        sum(
            1
            for item in announcements
            if item.id not in read_announcement_ids
        )
        if user.role == "student"
        else 0
    )

    unread_personal = sum(
        1 for item in notifications if item.read_at is None
    )

    return {
        "announcements": [
            serialize_announcement(
                item,
                is_read=(
                    item.id in read_announcement_ids
                    if user.role == "student"
                    else None
                ),
            )
            for item in announcements
        ],
        "notifications": [
            serialize_notification(item) for item in notifications
        ],
        "unread_count": unread_announcements + unread_personal,
        "unread_announcement_count": unread_announcements,
        "unread_personal_count": unread_personal,
    }


@router.get("/groups")
def get_student_groups(
    _: User = Depends(require_role("staff")),
    db: Session = Depends(get_db),
):
    groups = db.scalars(
        select(StudentProfile.group_name)
        .where(StudentProfile.group_name.is_not(None))
        .distinct()
        .order_by(StudentProfile.group_name)
    ).all()

    return {"groups": groups}


@router.post("/announcements", status_code=201)
def create_announcement(
    body: AnnouncementCreate,
    user: User = Depends(require_role("staff")),
    db: Session = Depends(get_db),
):
    if body.category == "deadline" and body.event_at is None:
        raise ApiError(400, "deadline_requires_event_date")

    if body.target_group:
        group_exists = db.scalar(
            select(StudentProfile.user_id)
            .where(StudentProfile.group_name == body.target_group)
            .limit(1)
        )

        if group_exists is None:
            raise ApiError(400, "student_group_not_found")

    announcement = Announcement(
        title=body.title,
        body=body.body,
        category=body.category,
        target_group=body.target_group,
        event_at=body.event_at,
        is_published=True,
        created_by_user_id=user.id,
    )

    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    return serialize_announcement(announcement)


@router.delete("/announcements/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    _: User = Depends(require_role("staff")),
    db: Session = Depends(get_db),
):
    announcement = db.get(Announcement, announcement_id)

    if announcement is None:
        raise ApiError(404, "not_found")

    db.delete(announcement)
    db.commit()

    return {"ok": True, "deleted_id": announcement_id}


@router.patch("/announcements/{announcement_id}/read")
def mark_announcement_read(
    announcement_id: int,
    user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    announcement = db.scalar(
        visible_announcements_query(user, db).where(
            Announcement.id == announcement_id
        )
    )

    if announcement is None:
        raise ApiError(404, "not_found")

    read_record = db.get(
        AnnouncementRead,
        (announcement_id, user.id),
    )

    if read_record is None:
        db.add(
            AnnouncementRead(
                announcement_id=announcement_id,
                user_id=user.id,
            )
        )
        db.commit()

    return {"ok": True, "announcement_id": announcement_id}


@router.patch("/read-all")
def mark_all_read(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(UTC)

    result = db.execute(
        update(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.read_at.is_(None),
        )
        .values(read_at=now)
    )

    updated_announcements = 0

    if user.role == "student":
        announcements = db.scalars(
            visible_announcements_query(user, db)
        ).all()

        read_ids = set(
            db.scalars(
                select(AnnouncementRead.announcement_id).where(
                    AnnouncementRead.user_id == user.id
                )
            ).all()
        )

        for announcement in announcements:
            if announcement.id not in read_ids:
                db.add(
                    AnnouncementRead(
                        announcement_id=announcement.id,
                        user_id=user.id,
                        read_at=now,
                    )
                )
                updated_announcements += 1

    db.commit()

    return {
        "ok": True,
        "updated_personal": result.rowcount or 0,
        "updated_announcements": updated_announcements,
    }


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        )
    )

    if notification is None:
        raise ApiError(404, "not_found")

    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        db.commit()
        db.refresh(notification)

    return serialize_notification(notification)
