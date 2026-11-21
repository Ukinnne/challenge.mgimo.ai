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


def with_day(lesson: Lesson) -> dict:
    return {
        "date": lesson.lesson_date.isoformat(),
        "weekday": WEEKDAYS[lesson.lesson_date.weekday()],
        "lesson": lesson_out(lesson),
    }


@router.get("")
def week(
    offset: int = Query(0, ge=-8, le=8),  # 0 = эта неделя, 1 = следующая, -1 = прошлая
    user: User = Depends(student_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(MSK)
    today = now.date()
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
        "now": now.strftime("%H:%M"),
        "week_start": monday.isoformat(),
        "week_end": sunday.isoformat(),
        "offset": offset,
        "group": group,
        "days": days,
    }


@router.get("/upcoming")
def upcoming(user: User = Depends(student_user), db: Session = Depends(get_db)):
    """Данные для главной: что сегодня, что дальше и какие есть изменения."""
    now = datetime.now(MSK)
    today = now.date()
    now_t = now.time()

    rows = db.scalars(
        select(Lesson)
        .where(
            Lesson.group_name == user.student.group_name,
            Lesson.lesson_date >= today,
            Lesson.lesson_date <= today + timedelta(days=14),
        )
        .order_by(Lesson.lesson_date, Lesson.start_time)
    ).all()

    today_lessons = [l for l in rows if l.lesson_date == today]
    current = next(
        (l for l in today_lessons if l.status != "cancelled" and l.start_time <= now_t < l.end_time),
        None,
    )
    following = next(
        (l for l in rows if l.status != "cancelled" and (l.lesson_date > today or l.start_time > now_t)),
        None,
    )

    return {
        "now": now.strftime("%H:%M"),
        "today": today.isoformat(),
        "weekday": WEEKDAYS[today.weekday()],
        "today_lessons": [lesson_out(l) for l in today_lessons],
        "current": lesson_out(current) if current else None,
        "next": {**with_day(following), "is_today": following.lesson_date == today} if following else None,
        "changes": [with_day(l) for l in rows if l.status != "normal"][:5],
    }