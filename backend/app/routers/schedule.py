from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import student_user
from ..models import Lesson, User

router = APIRouter(prefix="/api/schedule", tags=["schedule"])

MSK = timezone(timedelta(hours=3))
WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]


def lesson_out(lesson: Lesson) -> dict:
    return {
        "id": lesson.id,
        "start": lesson.start_time.strftime("%H:%M"),
        "end": lesson.end_time.strftime("%H:%M"),
        "subject": lesson.subject,
        "kind": lesson.kind,
        "teacher": lesson.teacher,
        "room": lesson.room,
        "status": lesson.status,
        "note": lesson.note,
    }


@router.get("")
def week(
    offset: int = Query(0, ge=-8, le=8),  # 0 = эта неделя, 1 = следующая, -1 = прошлая
    user: User = Depends(student_user),
    db: Session = Depends(get_db),
):
    today = datetime.now(MSK).date()
    monday = today - timedelta(days=today.weekday()) + timedelta(weeks=offset)
    sunday = monday + timedelta(days=6)

    # Группа берётся из профиля вошедшего студента, а не из запроса
    group = user.student.group_name
    rows = db.scalars(
        select(Lesson)
        .where(Lesson.group_name == group, Lesson.lesson_date.between(monday, sunday))
        .order_by(Lesson.lesson_date, Lesson.start_time)
    ).all()

    days = []
    for i in range(7):
        day = monday + timedelta(days=i)
        days.append(
            {
                "date": day.isoformat(),
                "weekday": WEEKDAYS[i],
                "lessons": [lesson_out(l) for l in rows if l.lesson_date == day],
            }
        )

    return {
        "today": today.isoformat(),
        "week_start": monday.isoformat(),
        "week_end": sunday.isoformat(),
        "offset": offset,
        "group": group,
        "days": days,
    }