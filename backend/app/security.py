from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

# Argon2id с безопасными параметрами по умолчанию
_hasher = PasswordHasher()


def hash_password(plain: str) -> str:
    """Превращает пароль в необратимый хеш (с автоматической солью)."""
    return _hasher.hash(plain)


def verify_password(stored_hash: str, plain: str) -> bool:
    """Проверяет, подходит ли введённый пароль к хешу из базы."""
    try:
        return _hasher.verify(stored_hash, plain)
    except (VerificationError, InvalidHashError):
        return False
