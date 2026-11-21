from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import student_user
from ..models import CourseResult, User

router = APIRouter(prefix="/api/grades", tags=["grades"])

MSK = timezone(timedelta(hours=3))
PASS_POINTS = 60  # порог зачёта. Для своего вуза значение можно поменять


def level(points: int) -> str:
    if points >= 70:
        return "good"
    if points >= 50:
        return "mid"
    return "risk"


def course_out(r: CourseResult, today) -> dict:
    points = r.points or 0
    return {
        "id": r.id,
        "subject": r.subject,
        "teacher": r.teacher,
        "control": r.control,
        "points": points,
        "level": level(points),
        "to_pass": max(0, PASS_POINTS - points),
        "exam_date": r.exam_date.isoformat() if r.exam_date else None,
        "days_left": (r.exam_date - today).days if r.exam_date else None,
    }


@router.get("")
def grades(user: User = Depends(student_user), db: Session = Depends(get_db)):
    today = datetime.now(MSK).date()

    # Только строки вошедшего студента: фильтр по user.id из сессии, а не из запроса
    rows = db.scalars(
        select(CourseResult).where(CourseResult.user_id == user.id).order_by(CourseResult.subject)
    ).all()

    current = [r for r in rows if r.is_current]
    past = [r for r in rows if not r.is_current]
    courses = [course_out(r, today) for r in current]

    summary = None
    if courses:
        dated = sorted((c for c in courses if c["exam_date"]), key=lambda c: c["exam_date"])
        weakest = min(courses, key=lambda c: c["points"])
        summary = {
            "average_points": round(sum(c["points"] for c in courses) / len(courses), 1),
            "counts": {k: sum(1 for c in courses if c["level"] == k) for k in ("good", "mid", "risk")},
            "next_control": dated[0] if dated else None,
            "focus": weakest if weakest["level"] != "good" else None,
        }

    terms: dict[str, list[CourseResult]] = {}
    for r in sorted(past, key=lambda r: (-r.term_order, r.subject)):
        terms.setdefault(r.term, []).append(r)

    history = []
    for term, items in terms.items():
        exam_marks = [int(r.mark) for r in items if r.control == "exam" and r.mark in {"5", "4", "3", "2"}]
        history.append(
            {
                "term": term,
                "gpa": round(sum(exam_marks) / len(exam_marks), 2) if exam_marks else None,
                "items": [
                    {"subject": r.subject, "teacher": r.teacher, "control": r.control, "mark": r.mark}
                    for r in items
                ],
            }
        )

    return {
        "term": current[0].term if current else None,
        "pass_points": PASS_POINTS,
        "courses": courses,
        "summary": summary,
        "history": history,
    }