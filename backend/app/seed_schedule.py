from datetime import datetime, time, timedelta, timezone

from sqlalchemy import delete

from . import models  # noqa: F401
from .db import Base, SessionLocal, engine
from .models import Lesson

MSK = timezone(timedelta(hours=3))

# (день недели: 0 = понедельник, начало, конец, предмет, вид, преподаватель, аудитория)
# Все преподаватели вымышленные.
TEMPLATES = {
    "Б9123-09.03.03": [
        (0, "09:00", "10:30", "Базы данных", "lecture", "доц. Ветров И. С.", "ауд. 312"),
        (0, "10:40", "12:10", "Базы данных", "lab", "ст. преп. Крылов Д. М.", "ауд. 215"),
        (1, "10:40", "12:10", "Веб-разработка", "lecture", "проф. Солодова Н. А.", "ауд. 401"),
        (1, "12:40", "14:10", "Веб-разработка", "practice", "ст. преп. Крылов Д. М.", "ауд. 215"),
        (2, "09:00", "10:30", "Теория вероятностей", "lecture", "доц. Белова Т. Р.", "ауд. 118"),
        (2, "10:40", "12:10", "Английский язык", "practice", "преп. Зимина О. К.", "ауд. 207"),
        (3, "12:40", "14:10", "Проектный менеджмент", "lecture", "доц. Яковлев М. Н.", "ауд. 305"),
        (3, "14:20", "15:50", "Проектный менеджмент", "practice", "доц. Яковлев М. Н.", "ауд. 305"),
        (4, "09:00", "10:30", "Операционные системы", "lecture", "проф. Гордеев А. Л.", "ауд. 118"),
        (4, "10:40", "12:10", "Операционные системы", "lab", "ст. преп. Орлов П. Т.", "ауд. 215"),
    ],
    "Б1124-42.03.01": [
        (0, "10:40", "12:10", "История России", "lecture", "доц. Миронова Е. В.", "ауд. 501"),
        (0, "12:40", "14:10", "Основы рекламы", "lecture", "проф. Солодова Н. А.", "ауд. 403"),
        (1, "09:00", "10:30", "Русский язык и культура речи", "practice", "ст. преп. Власова Л. Д.", "ауд. 209"),
        (1, "10:40", "12:10", "Философия", "lecture", "проф. Гордеев А. Л.", "ауд. 501"),
        (2, "12:40", "14:10", "Основы рекламы", "practice", "доц. Белова Т. Р.", "ауд. 403"),
        (2, "14:20", "15:50", "Английский язык", "practice", "преп. Зимина О. К.", "ауд. 207"),
        (3, "09:00", "10:30", "Социология", "lecture", "доц. Миронова Е. В.", "ауд. 501"),
        (3, "10:40", "12:10", "Социология", "practice", "ст. преп. Орлов П. Т.", "ауд. 410"),
        (4, "10:40", "12:10", "Информационные технологии", "lab", "ст. преп. Крылов Д. М.", "ауд. 215"),
        (4, "12:40", "14:10", "Физическая культура", "practice", "преп. Власов К. Е.", "спортзал"),
    ],
}


def build_lessons(today):
    """Шаблон недели повторяется 6 недель: с прошлой недели и на 4 недели вперёд."""
    start = today - timedelta(days=today.weekday()) - timedelta(weeks=1)
    lessons = []
    for group, items in TEMPLATES.items():
        for offset in range(7 * 6):
            day = start + timedelta(days=offset)
            for weekday, begin, end, subject, kind, teacher, room in items:
                if day.weekday() == weekday:
                    lessons.append(
                        Lesson(
                            group_name=group,
                            lesson_date=day,
                            start_time=time.fromisoformat(begin),
                            end_time=time.fromisoformat(end),
                            subject=subject,
                            kind=kind,
                            teacher=teacher,
                            room=room,
                        )
                    )
    return lessons


def apply_changes(lessons, today):
    """На ближайшие три учебных дня добавляем перенос, отмену и замену, чтобы они были видны."""
    for group in TEMPLATES:
        mine = sorted(
            (l for l in lessons if l.group_name == group and l.lesson_date >= today),
            key=lambda l: (l.lesson_date, l.start_time),
        )
        dates = sorted({l.lesson_date for l in mine})[:3]
        if len(dates) < 3:
            continue

        moved = [l for l in mine if l.lesson_date == dates[0]][0]
        moved.status = "moved"
        moved.note = f"Аудитория изменена: вместо {moved.room}"
        moved.room = "ауд. 408"

        cancelled = [l for l in mine if l.lesson_date == dates[1]][0]
        cancelled.status = "cancelled"
        cancelled.note = "Занятие отменено, преподаватель на конференции"

        replaced = [l for l in mine if l.lesson_date == dates[2]][-1]
        replaced.status = "replaced"
        replaced.note = f"Замена преподавателя: вместо {replaced.teacher}"
        replaced.teacher = "доц. Мартынова Е. А."


def main():
    Base.metadata.create_all(engine)
    today = datetime.now(MSK).date()
    lessons = build_lessons(today)
    apply_changes(lessons, today)
    with SessionLocal() as db:
        db.execute(delete(Lesson))
        db.add_all(lessons)
        db.commit()
    print(f"готово: {len(lessons)} занятий, сегодня по Москве {today}")


if __name__ == "__main__":
    main()