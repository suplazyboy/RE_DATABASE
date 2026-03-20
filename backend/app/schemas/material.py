"""
Pydantic schemas for Material API responses.
Based on 02-BACKEND-API.md specification and ALL_INFO.sql table structure.
"""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field
from enum import Enum
from uuid import UUID as PyUUID


# ===== 基础模型（列表页默认返回） =====
class MaterialSummary(BaseModel):
    """列表页展示的基础字段，约 15 个核心字段"""
    model_config = ConfigDict(from_attributes=True)

    material_id: str
    formula_pretty: str | None = None
    elements: list[str] | None = None
    nelements: int | None = None
    chemsys: str | None = None

    nsites: int | None = None
    volume: float | None = None
    density: float | None = None

    band_gap: float | None = None
    is_metal: bool | None = None
    is_stable: bool | None = None
    is_magnetic: bool | None = None
    energy_above_hull: float | None = None
    formation_energy_per_atom: float | None = None


# ===== 详情模型（详情页返回全部） =====
class MaterialDetail(MaterialSummary):
    """详情页返回的完整数据"""

    # 基础信息
    uuid: PyUUID | None = None
    id: int | None = None
    last_updated: datetime | None = None
    commit_time: datetime | None = None
    deprecated: bool | None = None
    deprecation_reasons: list[str] | None = None
    theoretical: bool | None = None

    # 成分与组成
    composition: dict[str, Any] | None = None
    composition_reduced: dict[str, Any] | None = None
    formula_anonymous: str | None = None
    possible_species: list[str] | None = None
    data_source: str | None = None

    # 结构信息
    structure: dict[str, Any] | None = None
    symmetry: dict[str, Any] | None = None
    density_atomic: float | None = None
    cif: str | None = None

    # 热力学
    uncorrected_energy_per_atom: float | None = None
    energy_per_atom: float | None = None
    equilibrium_reaction_energy_per_atom: float | None = None
    decomposes_to: list[dict[str, Any]] | Any | None = None

    # 电子结构
    cbm: float | None = None
    vbm: float | None = None
    efermi: float | None = None
    is_gap_direct: bool | None = None
    es_source_calc_id: str | None = None
    dos: dict[str, Any] | None = None
    bandstructure: dict[str, Any] | None = None
    dos_energy_up: dict[str, Any] | None = None
    dos_energy_down: dict[str, Any] | None = None

    # 磁性
    ordering: str | None = None
    total_magnetization: float | None = None
    total_magnetization_normalized_vol: float | None = None
    total_magnetization_normalized_formula_units: float | None = None
    num_magnetic_sites: int | None = None
    num_unique_magnetic_sites: int | None = None
    types_of_magnetic_species: list[str] | None = None

    # 力学
    bulk_modulus: dict[str, Any] | None = None
    shear_modulus: dict[str, Any] | None = None
    universal_anisotropy: float | None = None
    homogeneous_poisson: float | None = None

    # 介电
    e_total: float | None = None
    e_ionic: float | None = None
    e_electronic: float | None = None
    n: float | None = None
    e_ij_max: float | None = None

    # 表面
    weighted_surface_energy_EV_PER_ANG2: float | None = None
    weighted_surface_energy: float | None = None
    weighted_work_function: float | None = None
    surface_anisotropy: float | None = None
    shape_factor: float | None = None
    has_reconstructed: bool | None = None

    # 其他
    xas: list[dict[str, Any]] | Any | None = None
    grain_boundaries: dict[str, Any] | None = None
    database_IDs: dict[str, Any] | None = None
    has_props: dict[str, Any] | None = None
    created_at: datetime | None = None
    raw_data: dict[str, Any] | None = None


# ===== 分页响应包装 =====
class PaginationMeta(BaseModel):
    total: int
    page: int
    per_page: int
    total_pages: int


class PaginatedResponse(BaseModel):
    """统一分页响应格式"""
    data: list[dict]  # 动态字段投影，当 fields 参数指定时可能只包含部分字段
    meta: PaginationMeta


# ===== 枚举类型 =====
class SortField(str, Enum):
    material_id = "material_id"
    formula_pretty = "formula_pretty"
    band_gap = "band_gap"
    energy_above_hull = "energy_above_hull"
    formation_energy_per_atom = "formation_energy_per_atom"
    density = "density"
    volume = "volume"
    nsites = "nsites"


class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"