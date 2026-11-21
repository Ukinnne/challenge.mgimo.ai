from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select

from . import models  # noqa: F401
from .db import Base, SessionLocal, engine
from .models import CourseResult, User

MSK = timezone(timedelta(hours=3))

# Все данные вымышленные.
# current: (предмет, преподаватель, контроль, набранные баллы, через сколько дней экзамен/зачёт)
# past: (порядок, семестр, [(предмет, преподаватель, контроль, итог)])
DATA = {
    "student1": {
        "term": "Осенний семестр 2026/27",
        "current": [
            ("Базы данных", "доц. Ветров И. С.", "exam", 86, 28),
            ("Веб-разработка", "проф. Солодова Н. А.", "credit", 72, 21),
            ("Теория вероятностей", "доц. Белова Т. Р.", "exam", 48, 30),
            ("Английский язык", "преп. Зимина О. К.", "credit", 91, 20),
            ("Проектный менеджмент", "доц. Яковлев М. Н.", "credit", 64, 22),
            ("Операционные системы", "проф. Гордеев А. Л.", "exam", 58, 33),
        ],
        "past": [
            (1, "Весенний семестр 2025/26", [
                ("Алгоритмы и структуры данных", "доц. Ветров И. С.", "exam", "5"),
                ("Математический анализ", "проф. Гордеев А. Л.", "exam", "4"),
                ("Дискретная математика", "доц. Белова Т. Р.", "exam", "5"),
                ("Основы программирования", "ст. преп. Крылов Д. М.", "exam", "4"),
                ("Английский язык", "преп. Зимина О. К.", "credit", "pass"),
                ("Физическая культура", "преп. Власов К. Е.", "credit", "pass"),
            ]),
        ],
    },
    "student2": {
        "term": "Осенний семестр 2026/27",
        "current": [
            ("История России", "доц. Миронова Е. В.", "exam", 77, 27),
            ("Основы рекламы", "проф. Солодова Н. А.", "exam", 55, 31),
            ("Русский язык и культура речи", "ст. преп. Власова Л. Д.", "credit", 88, 20),
            ("Философия", "проф. Гордеев А. Л.", "exam", 69, 29),
            ("Социология", "доц. Миронова Е. В.", "credit", 40, 22),
            ("Английский язык", "преп. Зимина О. К.", "credit", 82, 20),
            ("Информационные технологии", "ст. преп. Крылов Д. М.", "credit", 93, 21),
            ("Физическая культура", "преп. Власов К. Е.", "credit", 70, 19),
        ],
        "past": [],  # первый курс: прошлых сессий нет, увидим пустое состояние
    },
}


def main():
    Base.metadata.create_all(engine)
    today = datetime.now(MSK).date()
    with SessionLocal() as db:
        db.execute(delete(CourseResult))
        for login, info in DATA.items():
            user = db.scalar(select(User).where(func.lower(User.login) == login))
            if user is None:
                print("нет пользователя", login, "(сначала запустите python -m app.seed)")
                continue
            for subject, teacher, control, points, days in info["current"]:
                db.add(CourseResult(
                    user_id=user.id, term=info["term"], term_order=99, is_current=True,
                    subject=subject, teacher=teacher, control=control, points=points,
                    exam_date=today + timedelta(days=days),
                ))
            for order, term, items in info["past"]:
                for subject, teacher, control, mark in items:
                    db.add(CourseResult(
                        user_id=user.id, term=term, term_order=order, is_current=False,
                        subject=subject, teacher=teacher, control=control, mark=mark,
                    ))
            print("готово:", login)
        db.commit()


if __name__ == "__main__":
    main()