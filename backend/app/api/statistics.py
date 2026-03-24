"""
Statistics API endpoints.
Provides database analytics and distribution data.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, bindparam, String
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY

from app.database import get_db
from app.models.material import Material
from app.utils.constants import RARE_EARTH_ELEMENTS, LIGHT_RE, HEAVY_RE, RARE_EARTH_NAMES_CN

router = APIRouter()


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
):
    """
    Get database summary statistics.
    Returns total counts and ratios for key properties.
    """
    from app.services.material_service import MaterialService
    service = MaterialService(db)
    return await service.get_statistics_summary()


@router.get("/band_gap_distribution")
async def get_band_gap_distribution(
    bins: int = Query(50, ge=10, le=200, description="Number of histogram bins"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get band gap distribution histogram data.
    Returns bin ranges and counts for materials with band gap values.
    """
    # Using width_bucket for database-side binning
    result = await db.execute(
        text("""
            SELECT
                width_bucket(band_gap, 0, 15, :bins) as bucket,
                count(*) as count,
                min(band_gap) as range_min,
                max(band_gap) as range_max
            FROM materials
            WHERE band_gap IS NOT NULL AND band_gap >= 0
            GROUP BY bucket
            ORDER BY bucket
        """),
        {"bins": bins}
    )

    distribution = []
    for row in result:
        bucket_data = {
            "bucket": row.bucket,
            "count": row.count,
            "range_min": row.range_min,
            "range_max": row.range_max,
            "range_label": f"{row.range_min:.2f}-{row.range_max:.2f}"
        }
        distribution.append(bucket_data)

    return distribution


@router.get("/elements_frequency")
async def get_elements_frequency(
    limit: int = Query(20, ge=1, le=100, description="Top N elements to return"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get frequency of elements across all materials.
    Returns most common elements and their counts.
    """
    # This query is complex with PostgreSQL arrays
    # Simplified version: we need to unnest the elements array
    result = await db.execute(
        text("""
            SELECT element, COUNT(*) as frequency
            FROM (
                SELECT unnest(elements) as element
                FROM materials
                WHERE elements IS NOT NULL AND array_length(elements, 1) > 0
            ) AS elements_expanded
            GROUP BY element
            ORDER BY frequency DESC
            LIMIT :limit
        """),
        {"limit": limit}
    )

    elements = []
    for row in result:
        elements.append({
            "element": row.element,
            "frequency": row.frequency
        })

    return elements


@router.get("/crystal_systems")
async def get_crystal_systems(
    db: AsyncSession = Depends(get_db),
):
    """
    Get distribution of crystal systems.
    Returns counts by crystal system (if symmetry data is available).
    """
    # This depends on how crystal system is stored
    # For now, return placeholder or query from symmetry JSONB
    result = await db.execute(
        text("""
            SELECT
                symmetry->>'crystal_system' as crystal_system,
                COUNT(*) as count
            FROM materials
            WHERE symmetry IS NOT NULL AND symmetry->>'crystal_system' IS NOT NULL
            GROUP BY symmetry->>'crystal_system'
            ORDER BY count DESC
        """)
    )

    systems = []
    for row in result:
        systems.append({
            "crystal_system": row.crystal_system,
            "count": row.count
        })

    return systems


@router.get("/stability_distribution")
async def get_stability_distribution(
    db: AsyncSession = Depends(get_db),
):
    """
    Get distribution of materials by stability.
    Returns counts for stable vs unstable materials.
    """
    stable_query = select(func.count()).select_from(Material).where(Material.is_stable == True)
    unstable_query = select(func.count()).select_from(Material).where(Material.is_stable == False)
    null_query = select(func.count()).select_from(Material).where(Material.is_stable.is_(None))

    stable_count = await db.scalar(stable_query)
    unstable_count = await db.scalar(unstable_query)
    null_count = await db.scalar(null_query)

    return {
        "stable": stable_count or 0,
        "unstable": unstable_count or 0,
        "unknown": null_count or 0,
        "total": (stable_count or 0) + (unstable_count or 0) + (null_count or 0)
    }


def _pg_array_literal(elements: list[str]) -> str:
    """将 Python list 转为 PostgreSQL 数组字面量，如 ARRAY['La','Ce',...]"""
    inner = ",".join(f"'{e}'" for e in elements)
    return f"ARRAY[{inner}]"


@router.get("/rare_earth_summary")
async def get_rare_earth_summary(
    db: AsyncSession = Depends(get_db),
):
    """
    Get summary statistics about rare earth materials.
    """
    re_arr    = _pg_array_literal(RARE_EARTH_ELEMENTS)
    light_arr = _pg_array_literal(LIGHT_RE)
    heavy_arr = _pg_array_literal(HEAVY_RE)

    result = await db.execute(text(f"""
        SELECT
            COUNT(*) as total_with_rare_earth,
            COUNT(*) FILTER (WHERE elements && {light_arr}) as light_re_count,
            COUNT(*) FILTER (WHERE elements && {heavy_arr}) as heavy_re_count
        FROM materials
        WHERE elements && {re_arr}
    """))
    row = result.first()
    if not row:
        return {
            "total_with_rare_earth": 0,
            "ratio": 0.0,
            "light_re_count": 0,
            "heavy_re_count": 0,
            "most_common": []
        }

    total_with_re = row.total_with_rare_earth or 0
    light_count = row.light_re_count or 0
    heavy_count = row.heavy_re_count or 0

    total_all = await db.scalar(text("SELECT COUNT(*) FROM materials")) or 0
    ratio = total_with_re / total_all if total_all > 0 else 0.0

    # Most common rare earth elements (top 5) — uses existing working bindparam approach
    freq_result = await db.execute(
        text("""
            SELECT element, COUNT(*) as count
            FROM (
                SELECT unnest(elements) as element
                FROM materials
                WHERE elements IS NOT NULL
            ) AS elements_expanded
            WHERE element = ANY(:rare_earth_elements)
            GROUP BY element
            ORDER BY count DESC
            LIMIT 5
        """).bindparams(
            bindparam("rare_earth_elements", value=RARE_EARTH_ELEMENTS, type_=PG_ARRAY(String))
        )
    )

    most_common = [
        {"element": r.element, "count": r.count}
        for r in freq_result
    ]

    return {
        "total_with_rare_earth": total_with_re,
        "ratio": ratio,
        "light_re_count": light_count,
        "heavy_re_count": heavy_count,
        "most_common": most_common
    }


@router.get("/rare_earth_frequency")
async def get_rare_earth_frequency(
    db: AsyncSession = Depends(get_db),
):
    """
    Get frequency of each rare earth element across all materials.
    """
    # Get counts for all rare earth elements
    freq_result = await db.execute(
        text("""
            SELECT element, COUNT(*) as count
            FROM (
                SELECT unnest(elements) as element
                FROM materials
                WHERE elements IS NOT NULL
            ) AS elements_expanded
            WHERE element = ANY(:rare_earth_elements)
            GROUP BY element
            ORDER BY count DESC
        """).bindparams(
            bindparam("rare_earth_elements", value=RARE_EARTH_ELEMENTS, type_=PG_ARRAY(String))
        )
    )

    elements = []
    for row in freq_result:
        element = row.element
        elements.append({
            "element": element,
            "name_cn": RARE_EARTH_NAMES_CN.get(element, ""),
            "count": row.count,
            "type": "light" if element in LIGHT_RE else "heavy"
        })

    return elements