
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import ApiError, current_user, require_role, student_user
from ..models import RequestStatusHistory, StudentRequest, User


router = APIRouter(prefix="/api/requests", tags=["requests"])


RequestType = Literal[
    "study_certificate",
    "academic_transcript",
    "other",
]

RequestStatus = Literal[
    "new",
    "in_progress",
    "completed",
    "rejected",
]


class RequestCreate(BaseModel):
    request_type: RequestType
    comment: str | None = Field(default=None, max_length=1000)

    @field_validator("comment")
    @classmethod
    def clean_comment(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None


class RequestStatusUpdate(BaseModel):
    status: RequestStatus
    comment: str | None = Field(default=None, max_length=1000)

    @field_validator("comment")
    @classmethod
    def clean_comment(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None


ALLOWED_TRANSITIONS = {
    "new": {"in_progress", "rejected"},
    "in_progress": {"completed", "rejected"},
    "completed": set(),
    "rejected": set(),
}


def serialize_request(request: StudentRequest) -> dict:
    return {
        "id": request.id,
        "request_type": request.request_type,
        "comment": request.comment,
        "status": request.status,
        "created_at": request.created_at.isoformat(),
        "updated_at": request.updated_at.isoformat(),
        "history": [
            {
                "old_status": event.old_status,
                "new_status": event.new_status,
                "actor_role": event.actor_role,
                "comment": event.comment,
                "created_at": event.created_at.isoformat(),
            }
            for event in request.history
        ],
    }


@router.get("")
def list_requests(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    query = select(StudentRequest)

    # Студент получает только собственные заявки.
    # Сотрудник получает общий список.
    if user.role == "student":
        query = query.where(StudentRequest.user_id == user.id)

    requests = db.scalars(
        query.order_by(StudentRequest.created_at.desc())
    ).all()

    return {
        "requests": [serialize_request(item) for item in requests]
    }


@router.post("", status_code=201)
def create_request(
    body: RequestCreate,
    user: User = Depends(student_user),
    db: Session = Depends(get_db),
):
    request = StudentRequest(
        user_id=user.id,
        request_type=body.request_type,
        comment=body.comment,
        status="new",
    )

    db.add(request)
    db.flush()

    db.add(
        RequestStatusHistory(
            request_id=request.id,
            changed_by_user_id=user.id,
            actor_role="student",
            old_status=None,
            new_status="new",
            comment="Заявка создана",
        )
    )

    db.commit()
    db.refresh(request)

    return serialize_request(request)


@router.get("/{request_id}")
def get_request(
    request_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    query = select(StudentRequest).where(
        StudentRequest.id == request_id
    )

    if user.role == "student":
        query = query.where(StudentRequest.user_id == user.id)

    request = db.scalar(query)

    if request is None:
        raise ApiError(404, "not_found")

    return serialize_request(request)


@router.patch("/{request_id}/status")
def update_request_status(
    request_id: int,
    body: RequestStatusUpdate,
    user: User = Depends(require_role("staff")),
    db: Session = Depends(get_db),
):
    request = db.scalar(
        select(StudentRequest).where(
            StudentRequest.id == request_id
        )
    )

    if request is None:
        raise ApiError(404, "not_found")

    if body.status == request.status:
        return serialize_request(request)

    allowed = ALLOWED_TRANSITIONS.get(request.status, set())

    if body.status not in allowed:
        raise ApiError(409, "invalid_status_transition")

    old_status = request.status
    request.status = body.status

    db.add(
        RequestStatusHistory(
            request_id=request.id,
            changed_by_user_id=user.id,
            actor_role="staff",
            old_status=old_status,
            new_status=body.status,
            comment=body.comment,
        )
    )

    db.commit()
    db.refresh(request)

    return serialize_request(request)
