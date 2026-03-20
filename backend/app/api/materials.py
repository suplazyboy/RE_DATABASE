"""
Material API endpoints.
Handles material listing and detail retrieval.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.material import MaterialSummary, MaterialDetail, PaginatedResponse, SortField, SortOrder
from app.schemas.search import MaterialSearchParams
from app.services.material_service import MaterialService

router = APIRouter()


@router.get("", response_model=PaginatedResponse)
async def list_materials(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    sort_field: SortField = Query(SortField.material_id, description="Field to sort by"),
    sort_order: SortOrder = Query(SortOrder.asc, description="Sort order"),
    fields: str | None = Query(None, description="Comma-separated field names to return"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated list of materials.
    Supports sorting, pagination, and field projection.
    """
    service = MaterialService(db)
    return await service.list_materials(
        page=page,
        per_page=per_page,
        sort_field=sort_field,
        sort_order=sort_order,
        fields=fields,
    )


@router.get("/{material_id}", response_model=MaterialDetail)
async def get_material(
    material_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get material details by material_id.
    Returns full material data including all properties.
    """
    service = MaterialService(db)
    material = await service.get_by_id(material_id)
    if not material:
        raise HTTPException(
            status_code=404,
            detail=f"Material '{material_id}' not found"
        )
    return material


@router.get("/search/advanced", response_model=PaginatedResponse)
async def search_materials_advanced(
    params: MaterialSearchParams = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Advanced material search with multiple filters.
    All search parameters are optional - combine them for complex queries.
    """
    service = MaterialService(db)
    return await service.search_materials(params)