from sqlalchemy import func, select

from . import models  # noqa: F401
from .db import Base, SessionLocal, engine
from .models import StaffProfile, StudentProfile, User
from .security import hash_password

# Только вымышленные люди и данные. Эти аккаунты мы дадим жюри.
ACCOUNTS = [
    {
        "login": "student1",
        "password": "Student1-Test!",
        "role": "student",
        "profile": {
            "full_name": "Тестова Алина Сергеевна",
            "faculty": "Институт цифровых технологий",
            "program": "09.03.03 Прикладная информатика",
            "course": 3,
            "group_name": "Б9123-09.03.03",
            "record_book": "TST-100001",
        },
    },
    {
        "login": "student2",
        "password": "Student2-Test!",
        "role": "student",
        "profile": {
            "full_name": "Пробин Дмитрий Андреевич",
            "faculty": "Институт гуманитарных наук",
            "program": "42.03.01 Реклама и связи с общественностью",
            "course": 1,
            "group_name": "Б1124-42.03.01",
            "record_book": "TST-100002",
        },
    },
    {
        "login": "dean",
        "password": "Dean-Test-2026!",
        "role": "staff",
        "profile": {
            "full_name": "Образцова Мария Ивановна",
            "position": "Специалист деканата",
        },
    },
]


def main():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        for acc in ACCOUNTS:
            user = db.scalar(
                select(User).where(func.lower(User.login) == acc["login"].lower())
            )
            if user is None:
                user = User(login=acc["login"], role=acc["role"], password_hash="")
                db.add(user)

            user.password_hash = hash_password(acc["password"])
            user.failed_attempts = 0
            user.locked_until = None

            if acc["role"] == "student":
                cls, attr = StudentProfile, "student"
            else:
                cls, attr = StaffProfile, "staff"

            profile = getattr(user, attr)
            if profile is None:
                setattr(user, attr, cls(**acc["profile"]))
            else:
                for key, value in acc["profile"].items():
                    setattr(profile, key, value)

            print("готово:", acc["login"])
        db.commit()


if __name__ == "__main__":
    main()
