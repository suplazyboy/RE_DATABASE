"""
API router registration.
All routers are registered here and then included in main.py.
"""

from fastapi import APIRouter
from app.api import materials, search, statistics, export

router = APIRouter()

router.include_router(materials.router, prefix="/materials", tags=["Materials"])
router.include_router(search.router, prefix="/search", tags=["Search"])
router.include_router(statistics.router, prefix="/statistics", tags=["Statistics"])
router.include_router(export.router, prefix="/export", tags=["Export"])