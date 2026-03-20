"""
Database connection setup with SQLAlchemy async engine.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.config import settings

logger = logging.getLogger(__name__)

# Engine configuration with timeouts and retry settings
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,  # detect broken connections
    pool_timeout=30,  # seconds to wait for connection from pool
    connect_args={
        "timeout": 10,  # connection timeout in seconds
        "command_timeout": 60,  # statement timeout in seconds
    },
    echo=False,  # set to True for SQL query logging
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for FastAPI to get database session.
    Automatically rolls back on exception, commits on success.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


@asynccontextmanager
async def retry_db_operation(max_retries: int = 3, delay: float = 1.0):
    """
    Context manager for retrying database operations on transient failures.
    """
    for attempt in range(max_retries):
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
                break
            except SQLAlchemyError as e:
                await session.rollback()
                if attempt == max_retries - 1:
                    logger.error(f"Database operation failed after {max_retries} attempts: {e}")
                    raise
                logger.warning(f"Database operation failed (attempt {attempt + 1}/{max_retries}): {e}")
                await asyncio.sleep(delay * (2 ** attempt))  # Exponential backoff
            finally:
                await session.close()