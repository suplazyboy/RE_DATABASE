"""
Material service layer for database operations.
All database logic is encapsulated here, not in API routes.
Uses SQLAlchemy 2.0 select() syntax exclusively.
"""

from sqlalchemy import select, func, and_, or_, asc, desc, Text, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import text
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY

from app.models.material import Material
from app.schemas.material import SortField, SortOrder
from app.schemas.search import MaterialSearchParams
from app.utils.filters import FilterBuilder

# 允许投影的字段白名单（防止注入）
ALLOWED_FIELDS = {col.key for col in Material.__table__.columns}

# 列表页默认返回的字段（排除大型 JSONB 和 TEXT）
DEFAULT_LIST_FIELDS = [
    "material_id", "formula_pretty", "formula_anonymous", "elements",
    "nelements", "chemsys", "nsites", "volume", "density",
    # crystal_system 在 symmetry JSONB 中，不包含在此列表中
    "band_gap", "is_metal", "is_gap_direct", "is_stable",
    "is_magnetic", "energy_above_hull", "formation_energy_per_atom",
    "energy_per_atom", "density_atomic", "theoretical", "deprecated",
]

# 大型字段黑名单（仅在详情页返回）
LARGE_FIELDS = {
    "structure", "symmetry", "dos", "bandstructure",
    "dos_energy_up", "dos_energy_down", "raw_data", "cif",
    "bulk_modulus", "shear_modulus", "decomposes_to",
    "xas", "grain_boundaries", "composition", "composition_reduced",
}


class MaterialService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _build_select(self, fields: str | None):
        """根据 fields 参数构建 select 语句"""
        if not fields:
            # 默认返回 Summary 级别的字段，排除大型 JSONB
            columns = [
                getattr(Material, f) for f in DEFAULT_LIST_FIELDS
                if hasattr(Material, f)
            ]
            # 添加从 symmetry JSONB 提取的字段
            if hasattr(Material, 'symmetry'):
                columns.append(Material.symmetry['crystal_system'].astext.label('crystal_system'))
                columns.append(cast(Material.symmetry['number'].astext, Integer).label('space_group_number'))
            return select(*columns)

        requested = [f.strip() for f in fields.split(",")]
        # 白名单过滤
        valid_fields = [f for f in requested if f in ALLOWED_FIELDS]

        if not valid_fields:
            # 如果请求的字段都不在白名单中，返回默认字段
            columns = [
                getattr(Material, f) for f in DEFAULT_LIST_FIELDS
                if hasattr(Material, f)
            ]
            # 添加从 symmetry JSONB 提取的字段
            if hasattr(Material, 'symmetry'):
                columns.append(Material.symmetry['crystal_system'].astext.label('crystal_system'))
                columns.append(cast(Material.symmetry['number'].astext, Integer).label('space_group_number'))
            return select(*columns)

        # 确保 material_id 始终包含（作为主键/标识）
        if "material_id" not in valid_fields:
            valid_fields.insert(0, "material_id")

        columns = [getattr(Material, f) for f in valid_fields]
        return select(*columns)

    async def list_materials(
        self,
        page: int = 1,
        per_page: int = 20,
        sort_field: SortField = SortField.material_id,
        sort_order: SortOrder = SortOrder.asc,
        fields: str | None = None,
    ) -> dict:
        """获取材料列表（分页、排序、字段投影）"""
        # 构建基础查询
        query = self._build_select(fields)
        count_query = select(func.count()).select_from(Material)

        # 排序
        order_col = getattr(Material, sort_field.value, Material.material_id)
        if sort_order == SortOrder.desc:
            order_col = order_col.desc()
        else:
            order_col = order_col.asc()
        query = query.order_by(order_col)

        # 分页
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page)

        # 执行查询
        result = await self.db.execute(query)
        total = await self.db.scalar(count_query)

        rows = result.all()
        materials = [dict(row._mapping) for row in rows]

        # 计算总页数
        total_pages = (total + per_page - 1) // per_page if total > 0 else 0

        return {
            "data": materials,
            "meta": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
            }
        }

    async def get_by_id(self, material_id: str) -> Material | None:
        """根据 material_id 获取单个材料详情"""
        query = select(Material).where(Material.material_id == material_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def search_materials(
        self,
        params: MaterialSearchParams,
    ) -> dict:
        """高级搜索材料（支持多个过滤条件）"""
        # 基础查询
        query = self._build_select(params.fields)
        count_query = select(func.count()).select_from(Material)

        # 使用 FilterBuilder 构建过滤条件
        builder = FilterBuilder()

        # 化学组成过滤
        builder.add_formula(params.formula)
        builder.add_elements_include(params.elements)
        builder.add_elements_exclude(params.exclude_elements)
        builder.add_chemsys(params.chemsys)
        builder.add_int_range("nelements", params.nelements_min, params.nelements_max)

        # 电子结构过滤
        builder.add_range("band_gap", params.band_gap_min, params.band_gap_max)
        builder.add_boolean("is_metal", params.is_metal)
        builder.add_boolean("is_gap_direct", params.is_gap_direct)

        # 稳定性过滤
        builder.add_boolean("is_stable", params.is_stable)
        builder.add_range("energy_above_hull", None, params.energy_above_hull_max)

        # 磁性过滤
        builder.add_boolean("is_magnetic", params.is_magnetic)
        builder.add_exact("ordering", params.ordering)

        # 结构过滤（crystal_system 和 space_group_number 从 symmetry JSONB 中提取）
        builder.add_crystal_system(params.crystal_system)
        builder.add_space_group_number(params.space_group_number)
        builder.add_int_range("nsites", params.nsites_min, params.nsites_max)
        builder.add_range("volume", params.volume_min, params.volume_max)
        builder.add_range("density", params.density_min, params.density_max)

        # 稀土筛选
        builder.add_rare_earth_filter(params.contains_rare_earth, params.rare_earth_type)

        # 构建过滤条件
        conditions = builder.build()
        if conditions is not None:
            query = query.where(conditions)
            count_query = count_query.where(conditions)

        # 排序
        order_col = getattr(Material, params.sort_field.value, Material.material_id)
        if params.sort_order == SortOrder.desc:
            order_col = order_col.desc()
        else:
            order_col = order_col.asc()
        query = query.order_by(order_col)

        # 分页
        offset = (params.page - 1) * params.per_page
        query = query.offset(offset).limit(params.per_page)

        # 执行查询
        result = await self.db.execute(query)
        total = await self.db.scalar(count_query)

        rows = result.all()
        materials = [dict(row._mapping) for row in rows]

        # 计算总页数
        total_pages = (total + params.per_page - 1) // params.per_page if total > 0 else 0

        return {
            "data": materials,
            "meta": {
                "total": total,
                "page": params.page,
                "per_page": params.per_page,
                "total_pages": total_pages,
            }
        }

    async def get_statistics_summary(self) -> dict:
        """获取数据库总体统计"""
        total_query = select(func.count()).select_from(Material)
        stable_query = select(func.count()).select_from(Material).where(Material.is_stable == True)
        metal_query = select(func.count()).select_from(Material).where(Material.is_metal == True)
        magnetic_query = select(func.count()).select_from(Material).where(Material.is_magnetic == True)

        total = await self.db.scalar(total_query)
        stable_count = await self.db.scalar(stable_query)
        metal_count = await self.db.scalar(metal_query)
        magnetic_count = await self.db.scalar(magnetic_query)

        return {
            "total_materials": total or 0,
            "stable_count": stable_count or 0,
            "stable_ratio": stable_count / total if total and total > 0 else 0.0,
            "metal_count": metal_count or 0,
            "metal_ratio": metal_count / total if total and total > 0 else 0.0,
            "magnetic_count": magnetic_count or 0,
            "magnetic_ratio": magnetic_count / total if total and total > 0 else 0.0,
        }