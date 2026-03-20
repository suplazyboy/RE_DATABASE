"""
Search API endpoints.
Includes autocomplete and formula search.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, Text, cast, and_, or_
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from app.database import get_db
from app.models.material import Material
from app.services.material_service import MaterialService
from app.schemas.search import MaterialSearchParams
from app.schemas.material import SortField, SortOrder

router = APIRouter()


@router.get("/formula/autocomplete")
async def formula_autocomplete(
    query: str = Query(..., min_length=1, description="Partial formula to search for"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of suggestions"),
    db: AsyncSession = Depends(get_db),
):
    """
    Autocomplete for chemical formulas.
    Returns matching formula_pretty values for typeahead suggestions.
    """
    stmt = (
        select(Material.formula_pretty)
        .where(Material.formula_pretty.ilike(f"%{query}%"))
        .distinct()
        .limit(limit)
    )
    result = await db.execute(stmt)
    formulas = result.scalars().all()
    return formulas


@router.get("/formula")
async def search_by_formula(
    formula: str = Query(..., description="Exact formula to search for"),
    db: AsyncSession = Depends(get_db),
):
    """
    Search materials by exact chemical formula.
    """
    stmt = select(Material).where(Material.formula_pretty == formula)
    result = await db.execute(stmt)
    materials = result.scalars().all()
    return {"data": materials, "count": len(materials)}


@router.get("/elements")
async def search_by_elements(
    elements: str = Query(..., description="Comma-separated list of elements"),
    mode: str = Query("all", regex="^(all|any)$", description="'all' = must contain all, 'any' = contain any"),
    db: AsyncSession = Depends(get_db),
):
    """
    Search materials by element composition.
    - 'all' mode: material must contain ALL specified elements
    - 'any' mode: material must contain ANY of the specified elements
    """
    element_list = [e.strip() for e in elements.split(",") if e.strip()]

    if not element_list:
        return {"data": [], "count": 0}

    if mode == "all":
        # Must contain all elements
        filters = [Material.elements.op("@>")(cast([elem], PG_ARRAY(Text))) for elem in element_list]
        stmt = select(Material).where(and_(*filters))
    else:  # "any"
        # Contains any of the elements
        filters = [Material.elements.op("@>")(cast([elem], PG_ARRAY(Text))) for elem in element_list]
        stmt = select(Material).where(or_(*filters))

    result = await db.execute(stmt)
    materials = result.scalars().all()
    return {"data": materials, "count": len(materials)}


@router.get("/chemsys")
async def search_by_chemsys(
    chemsys: str = Query(..., description="Chemical system (e.g., 'Fe-O')"),
    db: AsyncSession = Depends(get_db),
):
    """
    Search materials by chemical system.
    """
    stmt = select(Material).where(Material.chemsys == chemsys)
    result = await db.execute(stmt)
    materials = result.scalars().all()
    return {"data": materials, "count": len(materials)}


@router.get("/materials")
async def search_materials(
    # 分页
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_field: SortField = Query(SortField.material_id),
    sort_order: SortOrder = Query(SortOrder.asc),
    fields: str | None = Query(None, description="Comma-separated field names"),

    # 化学组成过滤
    formula: str | None = Query(None, description="Exact formula, e.g., Fe2O3"),
    elements: str | None = Query(None, description="Comma-separated elements to include, e.g., Fe,O"),
    exclude_elements: str | None = Query(None, description="Elements to exclude"),
    chemsys: str | None = Query(None, description="Chemical system, e.g., Fe-O"),
    nelements_min: int | None = Query(None, ge=1, le=20),
    nelements_max: int | None = Query(None, ge=1, le=20),

    # 电子结构
    band_gap_min: float | None = Query(None, ge=0.0),
    band_gap_max: float | None = Query(None, ge=0.0),
    is_metal: bool | None = Query(None),
    is_gap_direct: bool | None = Query(None),

    # 稳定性
    is_stable: bool | None = Query(None),
    energy_above_hull_max: float | None = Query(None, ge=0.0),

    # 磁性
    is_magnetic: bool | None = Query(None),
    ordering: str | None = Query(None),

    # 结构
    crystal_system: str | None = Query(None),
    space_group_number: int | None = Query(None, ge=1, le=230),
    nsites_min: int | None = Query(None, ge=1),
    nsites_max: int | None = Query(None, ge=1),
    volume_min: float | None = Query(None, ge=0.0),
    volume_max: float | None = Query(None, ge=0.0),
    density_min: float | None = Query(None, ge=0.0),
    density_max: float | None = Query(None, ge=0.0),

    db: AsyncSession = Depends(get_db),
):
    """
    Advanced search for materials with multiple filter criteria.
    Returns paginated results.
    """
    # 构建搜索参数对象
    params = MaterialSearchParams(
        page=page,
        per_page=per_page,
        sort_field=sort_field,
        sort_order=sort_order,
        fields=fields,
        formula=formula,
        elements=elements,
        exclude_elements=exclude_elements,
        chemsys=chemsys,
        nelements_min=nelements_min,
        nelements_max=nelements_max,
        band_gap_min=band_gap_min,
        band_gap_max=band_gap_max,
        is_metal=is_metal,
        is_gap_direct=is_gap_direct,
        is_stable=is_stable,
        energy_above_hull_max=energy_above_hull_max,
        is_magnetic=is_magnetic,
        ordering=ordering,
        crystal_system=crystal_system,
        space_group_number=space_group_number,
        nsites_min=nsites_min,
        nsites_max=nsites_max,
        volume_min=volume_min,
        volume_max=volume_max,
        density_min=density_min,
        density_max=density_max,
    )

    service = MaterialService(db)
    return await service.search_materials(params)


