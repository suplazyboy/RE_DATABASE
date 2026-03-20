"""
Statistics API endpoints.
Provides database analytics and distribution data.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.database import get_db
from app.models.material import Material

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