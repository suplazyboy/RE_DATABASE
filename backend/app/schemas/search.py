"""
Search parameters schema for material queries.
Based on 02-BACKEND-API.md specification.
"""

from pydantic import BaseModel, Field
from app.schemas.material import SortField, SortOrder


class MaterialSearchParams(BaseModel):
    """高级搜索参数"""
    # 分页
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)

    # 排序
    sort_field: SortField = SortField.material_id
    sort_order: SortOrder = SortOrder.asc

    # 字段投影
    fields: str | None = Field(default=None, description="逗号分隔的字段名")

    # === 过滤条件 ===
    # 化学式/元素
    formula: str | None = Field(default=None, description="精确匹配 'Fe2O3'")
    elements: str | None = Field(default=None, description="逗号分隔 'Fe,O' — 包含这些元素")
    exclude_elements: str | None = Field(default=None, description="排除含有这些元素的材料")
    chemsys: str | None = Field(default=None, description="化学体系 'Fe-O'")
    nelements_min: int | None = Field(default=None, ge=1, le=20)
    nelements_max: int | None = Field(default=None, ge=1, le=20)

    # 电子结构
    band_gap_min: float | None = Field(default=None, ge=0.0)
    band_gap_max: float | None = Field(default=None, ge=0.0)
    is_metal: bool | None = Field(default=None)
    is_gap_direct: bool | None = Field(default=None)

    # 稳定性
    is_stable: bool | None = Field(default=None)
    energy_above_hull_max: float | None = Field(default=None, ge=0.0)

    # 磁性
    is_magnetic: bool | None = Field(default=None)
    ordering: str | None = Field(default=None)

    # 结构
    crystal_system: str | None = Field(default=None)
    space_group_number: int | None = Field(default=None, ge=1, le=230)
    nsites_min: int | None = Field(default=None, ge=1)
    nsites_max: int | None = Field(default=None, ge=1)
    volume_min: float | None = Field(default=None, ge=0.0)
    volume_max: float | None = Field(default=None, ge=0.0)
    density_min: float | None = Field(default=None, ge=0.0)
    density_max: float | None = Field(default=None, ge=0.0)

    # 稀土筛选
    contains_rare_earth: bool | None = Field(default=None, description="是否包含稀土元素")
    rare_earth_type: str | None = Field(default=None, description="稀土类型: 'light' | 'heavy'")