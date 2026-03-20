# 03 — 后端：高级搜索与过滤

## 目标
实现灵活的多条件组合搜索，支持范围查询、数组包含、JSONB 字段查询，并保证 40K+ 数据量下的查询性能。

---

## 1. 过滤器构建器 (`app/utils/filters.py`)

**核心设计**：将每个过滤条件映射为一个 SQLAlchemy `where` 子句，最后用 `and_()` 组合。

```python
from sqlalchemy import and_, or_, func, cast, String
from sqlalchemy.dialects.postgresql import ARRAY
from app.models.material import Material

class FilterBuilder:
    """动态构建查询过滤条件"""
    
    def __init__(self):
        self.conditions = []
    
    def add_formula(self, formula: str | None):
        """精确匹配化学式"""
        if formula:
            self.conditions.append(Material.formula_pretty == formula)
    
    def add_elements_include(self, elements: str | None):
        """包含指定元素（AND 逻辑：必须全部包含）"""
        if elements:
            element_list = [e.strip() for e in elements.split(",")]
            # 使用 PostgreSQL @> 操作符（数组包含）
            self.conditions.append(
                Material.elements.op("@>")(cast(element_list, ARRAY(String)))
            )
    
    def add_elements_exclude(self, elements: str | None):
        """排除含有指定元素的材料"""
        if elements:
            element_list = [e.strip() for e in elements.split(",")]
            # 使用 && 操作符（数组重叠）的否定
            self.conditions.append(
                ~Material.elements.op("&&")(cast(element_list, ARRAY(String)))
            )
    
    def add_chemsys(self, chemsys: str | None):
        """化学体系匹配"""
        if chemsys:
            self.conditions.append(Material.chemsys == chemsys)
    
    def add_range(self, field_name: str, min_val: float | None, max_val: float | None):
        """范围查询（通用）"""
        column = getattr(Material, field_name, None)
        if column is None:
            return
        if min_val is not None:
            self.conditions.append(column >= min_val)
        if max_val is not None:
            self.conditions.append(column <= max_val)
    
    def add_int_range(self, field_name: str, min_val: int | None, max_val: int | None):
        """整数范围查询"""
        column = getattr(Material, field_name, None)
        if column is None:
            return
        if min_val is not None:
            self.conditions.append(column >= min_val)
        if max_val is not None:
            self.conditions.append(column <= max_val)
    
    def add_boolean(self, field_name: str, value: bool | None):
        """布尔过滤"""
        if value is not None:
            column = getattr(Material, field_name, None)
            if column is not None:
                self.conditions.append(column == value)
    
    def add_exact(self, field_name: str, value: str | None):
        """精确匹配"""
        if value is not None:
            column = getattr(Material, field_name, None)
            if column is not None:
                self.conditions.append(column == value)
    
    def build(self):
        """返回组合后的条件"""
        if not self.conditions:
            return None
        return and_(*self.conditions)
```

## 2. 搜索端点 (`app/api/search.py`)

```python
from fastapi import APIRouter, Depends, Query
from app.schemas.search import MaterialSearchParams

router = APIRouter(prefix="/search")

@router.get("/materials")
async def search_materials(
    # 直接用 Query 参数而非 Body，方便 GET 请求和 URL 分享
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_field: str = Query("material_id"),
    sort_order: str = Query("asc"),
    
    # 化学组成过滤
    formula: str | None = Query(None, description="精确化学式，如 Fe2O3"),
    elements: str | None = Query(None, description="包含元素，逗号分隔，如 Fe,O"),
    exclude_elements: str | None = Query(None, description="排除元素"),
    chemsys: str | None = Query(None, description="化学体系，如 Fe-O"),
    nelements_min: int | None = Query(None),
    nelements_max: int | None = Query(None),
    
    # 电子结构
    band_gap_min: float | None = Query(None),
    band_gap_max: float | None = Query(None),
    is_metal: bool | None = Query(None),
    is_gap_direct: bool | None = Query(None),
    
    # 稳定性
    is_stable: bool | None = Query(None),
    energy_above_hull_max: float | None = Query(None),
    
    # 磁性
    is_magnetic: bool | None = Query(None),
    ordering: str | None = Query(None),
    
    # 结构
    crystal_system: str | None = Query(None),
    space_group_number: int | None = Query(None),
    nsites_min: int | None = Query(None),
    nsites_max: int | None = Query(None),
    volume_min: float | None = Query(None),
    volume_max: float | None = Query(None),
    density_min: float | None = Query(None),
    density_max: float | None = Query(None),
    
    db: AsyncSession = Depends(get_db),
):
    builder = FilterBuilder()
    
    # 化学组成
    builder.add_formula(formula)
    builder.add_elements_include(elements)
    builder.add_elements_exclude(exclude_elements)
    builder.add_chemsys(chemsys)
    builder.add_int_range("nelements", nelements_min, nelements_max)
    
    # 电子结构
    builder.add_range("band_gap", band_gap_min, band_gap_max)
    builder.add_boolean("is_metal", is_metal)
    builder.add_boolean("is_gap_direct", is_gap_direct)
    
    # 稳定性
    builder.add_boolean("is_stable", is_stable)
    builder.add_range("energy_above_hull", None, energy_above_hull_max)
    
    # 磁性
    builder.add_boolean("is_magnetic", is_magnetic)
    builder.add_exact("ordering", ordering)
    
    # 结构
    builder.add_exact("crystal_system", crystal_system)
    if space_group_number is not None:
        builder.add_exact("space_group_number", space_group_number)
    builder.add_int_range("nsites", nsites_min, nsites_max)
    builder.add_range("volume", volume_min, volume_max)
    builder.add_range("density", density_min, density_max)
    
    # 构建查询
    conditions = builder.build()
    service = MaterialService(db)
    return await service.search(conditions, page, per_page, sort_field, sort_order)
```

## 3. 自动补全端点

```python
@router.get("/autocomplete")
async def autocomplete_formula(
    q: str = Query(..., min_length=1, max_length=50, description="搜索关键词"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """化学式前缀自动补全"""
    result = await db.execute(
        select(Material.formula_pretty)
        .where(Material.formula_pretty.ilike(f"{q}%"))
        .distinct()
        .order_by(Material.formula_pretty)
        .limit(limit)
    )
    return [row[0] for row in result if row[0]]
```

## 4. 数据库索引利用

确认以下查询能命中已有索引（参考 `ALL_INFO.sql` 中的索引定义）：

| 查询类型 | 应命中的索引 |
|----------|-------------|
| `elements @> ARRAY['Fe']` | GIN 索引 on elements |
| `band_gap BETWEEN x AND y` | B-tree on band_gap |
| `is_stable = true` | B-tree on is_stable |
| `formula_pretty = 'Fe2O3'` | B-tree on formula_pretty |
| `chemsys = 'Fe-O'` | B-tree on chemsys |
| `energy_above_hull <= 0.05` | B-tree on energy_above_hull |

**如果缺少索引**，在搜索性能不佳时，添加：
```sql
CREATE INDEX CONCURRENTLY idx_materials_crystal_system ON materials(crystal_system);
CREATE INDEX CONCURRENTLY idx_materials_space_group ON materials(space_group_number);
CREATE INDEX CONCURRENTLY idx_materials_nelements ON materials(nelements);
```

## 5. 查询性能优化

### 5.1 Count 查询优化

对于大数据量，精确 `COUNT(*)` 可能很慢。提供两种策略：

```python
async def get_total_count(self, conditions, use_estimate=False):
    if use_estimate and conditions is None:
        # 无过滤条件时用 pg_class 估算值（毫秒级）
        result = await self.db.execute(
            text("SELECT reltuples::bigint FROM pg_class WHERE relname = 'materials'")
        )
        return result.scalar() or 0
    
    # 有过滤条件时必须精确计数
    count_query = select(func.count()).select_from(Material)
    if conditions is not None:
        count_query = count_query.where(conditions)
    return await self.db.scalar(count_query)
```

### 5.2 Keyset Pagination (可选优化)

当数据量大且需要深度分页时，offset 分页性能会下降。可用 keyset pagination：

```python
# 替代 offset 分页的 keyset 方式
# 前端传入上一页最后一条的 material_id
async def list_materials_keyset(self, after_id: str | None, limit: int):
    query = select(Material).order_by(Material.material_id)
    if after_id:
        query = query.where(Material.material_id > after_id)
    query = query.limit(limit + 1)  # 多取一条判断是否有下一页
    
    result = await self.db.execute(query)
    items = result.scalars().all()
    
    has_next = len(items) > limit
    if has_next:
        items = items[:limit]
    
    return {
        "data": items,
        "has_next": has_next,
        "next_cursor": items[-1].material_id if items and has_next else None,
    }
```

---

## 6. 验收标准

- [ ] 单条件搜索正确（如只过滤 band_gap）
- [ ] 多条件组合搜索正确（如 band_gap + is_stable + elements）
- [ ] 元素包含/排除搜索正确
- [ ] 范围查询边界值正确（min 和 max 都包含）
- [ ] 搜索结果的分页和排序正确
- [ ] 自动补全返回正确的前缀匹配
- [ ] 无过滤条件时的列表性能 < 200ms
- [ ] 常用组合过滤性能 < 500ms

## 常见错误提醒

1. PostgreSQL 数组操作符 `@>` 和 `&&` 的参数必须 cast 为 `ARRAY(String)`
2. `ilike` 查询可能很慢，如果需要做全文搜索考虑用 GIN 的 trigram 索引
3. 排序字段必须做白名单校验，不能直接用用户输入 `getattr(Material, user_input)`
4. `None` 过滤条件不应该加入 where 子句（即 `band_gap_min=None` 表示不过滤）
5. 元素搜索 "Fe,O" 和化学体系 "Fe-O" 的语义不同：前者是包含，后者是精确体系
