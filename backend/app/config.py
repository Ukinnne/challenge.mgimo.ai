from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    cookie_secure: bool = False   # поставить True, когда сайт работает по HTTPS
    session_days: int = 7         # сколько дней живёт вход
    max_failed_attempts: int = 5  # сколько неверных паролей до блокировки
    lock_minutes: int = 15        # на сколько минут блокируем


settings = Settings()