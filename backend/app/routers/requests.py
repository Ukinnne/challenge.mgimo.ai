
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import ApiError, current_user, require_role, student_user
from ..models import (
    Notification,
    RequestStatusHistory,
    StudentProfile,
    StudentRequest,
    User,
)


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


STATUS_LABELS = {
    "new": "Новая",
    "in_progress": "В работе",
    "completed": "Выполнена",
    "rejected": "Отклонена",
}

REQUEST_TYPE_LABELS = {
    "study_certificate": "Справка об обучении",
    "academic_transcript": "Академическая справка",
    "other": "Обращение",
}


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


def serialize_request(
    request: StudentRequest,
    student: StudentProfile | None = None,
) -> dict:
    return {
        "id": request.id,
        "request_type": request.request_type,
        "comment": request.comment,
        "status": request.status,
        "created_at": request.created_at.isoformat(),
        "updated_at": request.updated_at.isoformat(),
        "student": (
            {
                "full_name": student.full_name,
                "faculty": student.faculty,
                "program": student.program,
                "course": student.course,
                "group_name": student.group_name,
            }
            if student
            else None
        ),
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


def get_student_profile(
    db: Session,
    user_id: int,
) -> StudentProfile | None:
    return db.get(StudentProfile, user_id)


@router.get("")
def list_requests(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(StudentRequest, StudentProfile)
        .outerjoin(
            StudentProfile,
            StudentRequest.user_id == StudentProfile.user_id,
        )
    )

    if user.role == "student":
        query = query.where(StudentRequest.user_id == user.id)

    query = query.order_by(StudentRequest.created_at.desc())

    rows = db.execute(query).all()

    return {
        "requests": [
            serialize_request(request, student)
            for request, student in rows
        ]
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

    db.add(
        Notification(
            user_id=user.id,
            title="Заявка принята",
            body=(
                f"Заявка №{request.id} "
                f"«{REQUEST_TYPE_LABELS[request.request_type]}» "
                "успешно создана и ожидает обработки"
            ),
            notification_type="request_created",
            related_request_id=request.id,
        )
    )

    db.commit()
    db.refresh(request)

    student = get_student_profile(db, user.id)

    return serialize_request(request, student)


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

    student = get_student_profile(db, request.user_id)

    return serialize_request(request, student)


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
        student = get_student_profile(db, request.user_id)
        return serialize_request(request, student)

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

    notification_body = (
        f"Статус вашей заявки №{request.id} "
        f"изменён на «{STATUS_LABELS[body.status]}»."
    )

    if body.comment:
        notification_body += f" Комментарий сотрудника: {body.comment}"

    db.add(
        Notification(
            user_id=request.user_id,
            title="Изменился статус заявки",
            body=notification_body,
            notification_type="request_status",
            related_request_id=request.id,
        )
    )

    db.commit()
    db.refresh(request)

    student = get_student_profile(db, request.user_id)

    return serialize_request(request, student)
