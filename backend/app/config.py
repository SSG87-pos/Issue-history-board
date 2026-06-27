import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    secret_key: str
    access_token_expires_minutes: int
    admin_username: str
    admin_password: str
    admin_display_name: str
    cors_origins: list[str]


def get_settings() -> Settings:
    cors_origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]
    return Settings(
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg2://issueboard:issueboard@localhost:5432/issueboard",
        ),
        secret_key=os.getenv("SECRET_KEY", "change-this-secret-before-production"),
        access_token_expires_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRES_MINUTES", "720")),
        admin_username=os.getenv("ADMIN_USERNAME", "admin"),
        admin_password=os.getenv("ADMIN_PASSWORD", "change-me"),
        admin_display_name=os.getenv("ADMIN_DISPLAY_NAME", "관리자"),
        cors_origins=cors_origins,
    )
