from . import models  # noqa: F401  (нужен, чтобы таблицы «зарегистрировались»)
from .db import Base, engine


def main():
    Base.metadata.create_all(engine)
    print("Таблицы созданы:", ", ".join(Base.metadata.tables))


if __name__ == "__main__":
    main()
