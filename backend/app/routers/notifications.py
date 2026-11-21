
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import ApiError, current_user, require_role
from ..models import Announcement, Notification, StudentProfile, User


router = APIRouter(
    prefix="/api/notifications",
    tags=["notifications"],
)


AnnouncementCategory = Literal["announcement", "deadline"]


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    body: str = Field(min_length=3, max_length=5000)
    category: AnnouncementCategory = "announcement"
    target_group: str | None = Field(default=None, max_length=64)
    event_at: datetime | None = None

    @field_validator("title", "body")
    @classmethod
    def clean_text(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Текст слишком короткий")
        return value

    @field_validator("target_group")
    @classmethod
    def clean_group(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None


def serialize_announcement(item: Announcement) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "body": item.body,
        "category": item.category,
        "target_group": item.target_group,
        "event_at": item.event_at.isoformat() if item.event_at else None,
        "created_at": item.created_at.isoformat(),
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


@router.get("")
def get_notifications(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    announcement_query = select(Announcement).where(
        Announcement.is_published.is_(True)
    )

    if user.role == "student":
        profile = db.get(StudentProfile, user.id)

        if profile is None:
            announcement_query = announcement_query.where(
                Announcement.target_group.is_(None)
            )
        else:
            announcement_query = announcement_query.where(
                (Announcement.target_group.is_(None))
                | (Announcement.target_group == profile.group_name)
            )

    announcement_query = announcement_query.order_by(
        Announcement.created_at.desc()
    )

    announcements = db.scalars(announcement_query).all()

    notification_query = (
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    )

    notifications = db.scalars(notification_query).all()

    unread_count = sum(
        1 for item in notifications if item.read_at is None
    )

    return {
        "announcements": [
            serialize_announcement(item) for item in announcements
        ],
        "notifications": [
            serialize_notification(item) for item in notifications
        ],
        "unread_count": unread_count,
    }


@router.post("/announcements", status_code=201)
def create_announcement(
    body: AnnouncementCreate,
    user: User = Depends(require_role("staff")),
    db: Session = Depends(get_db),
):
    if body.category == "deadline" and body.event_at is None:
        raise ApiError(400, "deadline_requires_event_date")

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


@router.patch("/read-all")
def mark_all_read(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    result = db.execute(
        update(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.read_at.is_(None),
        )
        .values(read_at=now)
    )

    db.commit()

    return {
        "ok": True,
        "updated": result.rowcount or 0,
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
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)

    return serialize_notification(notification)
