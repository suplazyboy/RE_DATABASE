# 02 — 后端：API 端点与 Pydantic Schema

## 目标
实现所有 RESTful API 端点，定义请求/响应模型，参考 Materials Project 格式。

---

## 1. Pydantic Schema 设计 (`app/schemas/material.py`)

### 核心设计原则：字段投影 (Field Projection)

70+ 个字段不能每次全部返回。采用 `fields` 参数控制返回哪些字段：

```
GET /api/v1/materials?fields=material_id,formula_pretty,band_gap,is_stable
```

### Schema 分层

```python
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any
from datetime import datetime

# ===== 基础模型（列表页默认返回） =====
class MaterialSummary(BaseModel):
    """列表页展示的基础字段，约 15 个核心字段"""
    model_config = ConfigDict(from_attributes=True)
    
    material_id: str
    formula_pretty: Optional[str] = None
    elements: Optional[list[str]] = None
    nelements: Optional[int] = None
    chemsys: Optional[str] = None
    
    crystal_system: Optional[str] = None
    space_group_symbol: Optional[str] = None
    nsites: Optional[int] = None
    volume: Optional[float] = None
    density: Optional[float] = None
    
    band_gap: Optional[float] = None
    is_metal: Optional[bool] = None
    is_stable: Optional[bool] = None
    is_magnetic: Optional[bool] = None
    energy_above_hull: Optional[float] = None
    formation_energy_per_atom: Optional[float] = None

# ===== 详情模型（详情页返回全部） =====
class MaterialDetail(MaterialSummary):
    """详情页返回的完整数据"""
    
    # 结构
    structure: Optional[dict[str, Any]] = None
    lattice: Optional[dict[str, Any]] = None
    density_atomic: Optional[float] = None
    
    # 对称性
    symmetry: Optional[dict[str, Any]] = None
    space_group_number: Optional[int] = None
    point_group: Optional[str] = None
    
    # 热力学
    energy_per_atom: Optional[float] = None
    equilibrium_reaction_energy_per_atom: Optional[float] = None
    decomposes_to: Optional[list[dict[str, Any]]] = None
    
    # 电子结构
    cbm: Optional[float] = None
    vbm: Optional[float] = None
    efermi: Optional[float] = None
    is_gap_direct: Optional[bool] = None
    dos: Optional[dict[str, Any]] = None
    bandstructure: Optional[dict[str, Any]] = None
    
    # 磁性
    ordering: Optional[str] = None
    total_magnetization: Optional[float] = None
    total_magnetization_normalized_vol: Optional[float] = None
    num_magnetic_sites: Optional[int] = None
    types_of_magnetic_species: Optional[list[str]] = None
    
    # 力学
    bulk_modulus: Optional[dict[str, Any]] = None
    shear_modulus: Optional[dict[str, Any]] = None
    universal_anisotropy: Optional[float] = None
    homogeneous_poisson: Optional[float] = None
    
    # 介电
    e_total: Optional[float] = None
    e_ionic: Optional[float] = None
    e_electronic: Optional[float] = None
    n: Optional[float] = None
    
    # 表面
    weighted_surface_energy: Optional[float] = None
    weighted_work_function: Optional[float] = None
    surface_anisotropy: Optional[float] = None
    shape_factor: Optional[float] = None
    
    # 元数据
    database_IDs: Optional[dict[str, Any]] = None
    last_updated: Optional[datetime] = None
    deprecated: Optional[bool] = None
    warnings: Optional[list[str]] = None

# ===== 分页响应包装 =====
class PaginatedResponse(BaseModel):
    """统一分页响应格式"""
    data: list[MaterialSummary]
    meta: "PaginationMeta"

class PaginationMeta(BaseModel):
    total: int
    page: int
    per_page: int
    total_pages: int
```

### 搜索参数模型 (`app/schemas/search.py`)

```python
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

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

class MaterialSearchParams(BaseModel):
    """高级搜索参数"""
    # 分页
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
    
    # 排序
    sort_field: SortField = SortField.material_id
    sort_order: SortOrder = SortOrder.asc
    
    # 字段投影
    fields: Optional[str] = None  # 逗号分隔的字段名
    
    # === 过滤条件 ===
    # 化学式/元素
    formula: Optional[str] = None           # 精确匹配 "Fe2O3"
    elements: Optional[str] = None          # 逗号分隔 "Fe,O" — 包含这些元素
    exclude_elements: Optional[str] = None  # 排除含有这些元素的材料
    chemsys: Optional[str] = None           # 化学体系 "Fe-O"
    nelements_min: Optional[int] = None
    nelements_max: Optional[int] = None
    
    # 电子结构
    band_gap_min: Optional[float] = None
    band_gap_max: Optional[float] = None
    is_metal: Optional[bool] = None
    is_gap_direct: Optional[bool] = None
    
    # 稳定性
    is_stable: Optional[bool] = None
    energy_above_hull_max: Optional[float] = None
    
    # 磁性
    is_magnetic: Optional[bool] = None
    ordering: Optional[str] = None
    
    # 结构
    crystal_system: Optional[str] = None
    space_group_number: Optional[int] = None
    nsites_min: Optional[int] = None
    nsites_max: Optional[int] = None
    volume_min: Optional[float] = None
    volume_max: Optional[float] = None
    density_min: Optional[float] = None
    density_max: Optional[float] = None
```

---

## 2. API 端点实现

### 路由注册 (`app/api/router.py`)

```python
from fastapi import APIRouter
from app.api import materials, search, statistics

router = APIRouter()
router.include_router(materials.router, tags=["Materials"])
router.include_router(search.router, tags=["Search"])
router.include_router(statistics.router, tags=["Statistics"])
```

### 端点清单

| 端点 | 方法 | 功能 | 返回 |
|------|------|------|------|
| `GET /materials` | GET | 材料列表（分页） | `PaginatedResponse` |
| `GET /materials/{material_id}` | GET | 材料详情 | `MaterialDetail` |
| `GET /materials/search` | GET | 高级搜索 | `PaginatedResponse` |
| `GET /materials/autocomplete` | GET | 化学式自动补全 | `list[str]` |
| `GET /statistics/summary` | GET | 总体统计 | 总数、稳定比例等 |
| `GET /statistics/band_gap_distribution` | GET | 带隙分布 | 直方图数据 |
| `GET /statistics/elements_frequency` | GET | 元素频率 | 柱状图数据 |
| `GET /statistics/crystal_systems` | GET | 晶系分布 | 饼图数据 |
| `GET /export` | GET | 导出数据 | CSV/JSON 文件流 |

### 材料端点示例 (`app/api/materials.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.material import MaterialSummary, MaterialDetail, PaginatedResponse
from app.services.material_service import MaterialService

router = APIRouter(prefix="/materials")

@router.get("", response_model=PaginatedResponse)
async def list_materials(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_field: str = Query("material_id"),
    sort_order: str = Query("asc"),
    fields: str | None = Query(None, description="逗号分隔的字段名"),
    db: AsyncSession = Depends(get_db),
):
    service = MaterialService(db)
    return await service.list_materials(page, per_page, sort_field, sort_order, fields)

@router.get("/{material_id}", response_model=MaterialDetail)
async def get_material(
    material_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = MaterialService(db)
    material = await service.get_by_id(material_id)
    if not material:
        raise HTTPException(status_code=404, detail=f"Material {material_id} not found")
    return material
```

---

## 3. Service 层 (`app/services/material_service.py`)

**关键要求**:
- **不要**在路由函数中直接写数据库查询，所有查询逻辑封装到 Service
- 使用 `select()` 语法（SQLAlchemy 2.0 style），**不要**用旧式 `query()`
- 分页使用 `offset/limit`，并用 `select(func.count())` 获取总数
- 字段投影通过动态构建 `select()` 的列列表实现

```python
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.material import Material

class MaterialService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def list_materials(self, page, per_page, sort_field, sort_order, fields=None):
        # 构建基础查询
        query = select(Material)
        count_query = select(func.count()).select_from(Material)
        
        # 排序
        order_col = getattr(Material, sort_field, Material.material_id)
        if sort_order == "desc":
            order_col = order_col.desc()
        query = query.order_by(order_col)
        
        # 分页
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page)
        
        # 执行
        result = await self.db.execute(query)
        total = await self.db.scalar(count_query)
        
        materials = result.scalars().all()
        
        return {
            "data": materials,
            "meta": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
            }
        }
```

---

## 4. 统计端点 (`app/api/statistics.py`)

统计查询可能较慢，**必须**添加缓存或使用物化视图。

```python
@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    """返回数据库总体统计"""
    total = await db.scalar(select(func.count()).select_from(Material))
    stable_count = await db.scalar(
        select(func.count()).select_from(Material).where(Material.is_stable == True)
    )
    metal_count = await db.scalar(
        select(func.count()).select_from(Material).where(Material.is_metal == True)
    )
    magnetic_count = await db.scalar(
        select(func.count()).select_from(Material).where(Material.is_magnetic == True)
    )
    
    return {
        "total_materials": total,
        "stable_count": stable_count,
        "stable_ratio": stable_count / total if total else 0,
        "metal_count": metal_count,
        "magnetic_count": magnetic_count,
    }

@router.get("/band_gap_distribution")
async def get_band_gap_distribution(
    bins: int = Query(50, ge=10, le=200),
    db: AsyncSession = Depends(get_db),
):
    """返回带隙值分布直方图数据"""
    # 使用 width_bucket 函数做数据库级别的分桶
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
    return [dict(row._mapping) for row in result]
```

---

## 5. 导出端点

使用 `StreamingResponse` 避免内存溢出：

```python
from fastapi.responses import StreamingResponse
import csv
import io

@router.get("/export")
async def export_materials(
    format: str = Query("csv", regex="^(csv|json)$"),
    # 支持与搜索相同的过滤参数
    db: AsyncSession = Depends(get_db),
):
    # 流式生成 CSV
    async def generate_csv():
        # 写入头部
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["material_id", "formula_pretty", "band_gap", ...])
        yield output.getvalue()
        
        # 分批查询数据
        batch_size = 1000
        offset = 0
        while True:
            result = await db.execute(
                select(Material).offset(offset).limit(batch_size)
            )
            materials = result.scalars().all()
            if not materials:
                break
            
            output = io.StringIO()
            writer = csv.writer(output)
            for m in materials:
                writer.writerow([m.material_id, m.formula_pretty, m.band_gap, ...])
            yield output.getvalue()
            offset += batch_size
    
    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=materials.csv"}
    )
```

---

## 6. 错误处理

全局异常处理器：

```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__}
    )
```

---

## 7. 验收标准

- [ ] 所有端点在 Swagger UI 中可用且有文档
- [ ] `GET /materials` 返回分页数据，格式正确
- [ ] `GET /materials/mp-xxx` 返回完整详情
- [ ] 排序、分页参数正常工作
- [ ] 不存在的 material_id 返回 404
- [ ] 大数据量下响应时间 < 1s（带索引的查询）

## 常见错误提醒

1. Pydantic v2 用 `model_config = ConfigDict(from_attributes=True)` 而不是 `class Config: orm_mode = True`
2. `response_model` 类型与实际返回的数据结构必须匹配
3. 不要忘记处理 `None` 值 — 数据库中大量字段可能为 null
4. JSONB 字段在 Pydantic 中用 `dict[str, Any]` 或 `Any` 类型
5. 分页的 `total_pages` 计算要用向上取整
