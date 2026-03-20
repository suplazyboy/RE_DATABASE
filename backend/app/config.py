"""
Configuration management using Pydantic Settings.
Loads from .env file.
"""
from pydantic import Field, field_validator, FieldValidationInfo
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:123456@localhost:5432/All_information"
    )
    DB_POOL_SIZE: int = Field(default=20, ge=1, le=100)
    DB_MAX_OVERFLOW: int = Field(default=10, ge=0, le=50)

    # Redis cache (optional)
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    CACHE_TTL: int = Field(default=300, ge=1, le=86400)  # 1 second to 1 day

    # API
    API_PREFIX: str = "/api/v1"
    DEFAULT_PAGE_SIZE: int = Field(default=20, ge=1, le=100)
    MAX_PAGE_SIZE: int = Field(default=100, ge=1, le=1000)

    # CORS - can be comma-separated string or list
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # Logging
    LOG_LEVEL: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")

    @field_validator("DB_POOL_SIZE", "DB_MAX_OVERFLOW")
    @classmethod
    def validate_pool_size(cls, v: int, info: FieldValidationInfo) -> int:
        if info.field_name == "DB_MAX_OVERFLOW" and v > cls.model_fields["DB_POOL_SIZE"].default:
            raise ValueError("max_overflow should not exceed pool_size")
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            # Split comma-separated string, strip whitespace
            return [url.strip() for url in v.split(",") if url.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()