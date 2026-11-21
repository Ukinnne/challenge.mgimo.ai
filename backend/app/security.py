import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

# Argon2id с безопасными параметрами по умолчанию
_hasher = PasswordHasher()

# «Пустышка» для случая, когда такого логина нет: проверка всё равно занимает то же время,
# поэтому по скорости ответа нельзя понять, существует ли логин
DUMMY_HASH = _hasher.hash("not-a-real-password")


def hash_password(plain: str) -> str:
    """Превращает пароль в необратимый хеш (с автоматической солью)."""
    return _hasher.hash(plain)


def verify_password(stored_hash: str, plain: str) -> bool:
    """Проверяет, подходит ли введённый пароль к хешу из базы."""
    try:
        return _hasher.verify(stored_hash, plain)
    except (VerificationError, InvalidHashError):
        return False


def new_token() -> str:
    """Случайный токен сессии: 256 бит, угадать нельзя."""
    return secrets.token_urlsafe(32)


def token_hash(token: str) -> str:
    """Отпечаток токена: именно он хранится в базе."""
    return hashlib.sha256(token.encode()).hexdigest()