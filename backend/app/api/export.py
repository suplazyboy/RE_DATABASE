"""
Data export endpoints.
Streams large datasets as CSV or JSON to avoid memory issues.
"""

import csv
import io
import json
from typing import AsyncGenerator
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.material import Material

router = APIRouter()


async def generate_material_csv(limit: int = None) -> AsyncGenerator[str, None]:
    """
    Generator for CSV data streaming.
    Processes materials in batches to avoid memory issues.
    """
    # In real implementation, this would use database cursor
    # For now, return empty CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        "material_id", "formula_pretty", "band_gap", "is_stable",
        "energy_above_hull", "volume", "density", "space_group_symbol"
    ])
    yield output.getvalue()

    # Note: Actual data streaming would require database cursor
    # This is a placeholder for the streaming logic


@router.get("/materials")
async def export_materials(
    format: str = Query("csv", regex="^(csv|json)$", description="Export format: csv or json"),
    limit: int = Query(None, ge=1, le=100000, description="Maximum number of records to export"),
    db: AsyncSession = Depends(get_db),
):
    """
    Export materials data as CSV or JSON stream.
    For large datasets, use streaming to avoid memory overflow.
    """
    if format == "csv":
        return StreamingResponse(
            generate_material_csv(limit),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=materials.csv"}
        )
    else:  # json
        # For JSON streaming, we could use JSON Lines format
        async def generate_json():
            batch_size = 1000
            offset = 0

            while True:
                query = select(Material).offset(offset).limit(batch_size)
                result = await db.execute(query)
                materials = result.scalars().all()

                if not materials:
                    break

                for material in materials:
                    # Convert to dict and yield as JSON line
                    material_dict = {
                        "material_id": material.material_id,
                        "formula_pretty": material.formula_pretty,
                        "band_gap": material.band_gap,
                        "is_stable": material.is_stable,
                        "energy_above_hull": material.energy_above_hull,
                        "volume": material.volume,
                        "density": material.density,
                    }
                    yield json.dumps(material_dict) + "\n"

                offset += batch_size

        return StreamingResponse(
            generate_json(),
            media_type="application/x-ndjson",  # JSON Lines format
            headers={"Content-Disposition": "attachment; filename=materials.jsonl"}
        )