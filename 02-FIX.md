# 02-FIX — 第二阶段问题修复指令

## 背景
02 阶段代码已生成，经验收发现以下 3 个问题需要修复。请逐一修复并验证。

---

## 修复 1：ARRAY 类型不匹配（必须修复）

### 问题
数据库中 `elements`、`deprecation_reasons`、`possible_species`、`types_of_magnetic_species` 列的类型是 `TEXT[]`。代码中使用 `ARRAY(String)` 做 cast，PostgreSQL 会报错：

```
操作符不存在: text[] @> character varying[]
```

因为 SQLAlchemy 的 `String` 映射为 `VARCHAR`，而数据库列是 `TEXT`，两者不能直接用 `@>` 操作。

### 修复要求

**搜索范围**：在整个 `backend/app/` 目录下搜索所有包含 `ARRAY(String)` 的文件。

**修复方式**：将所有用于 cast 或查询中的 `ARRAY(String)` 改为 `ARRAY(Text)`。

涉及的文件大概率包括：
- `app/services/material_service.py`
- `app/api/search.py`
- `app/utils/filters.py`（如果有的话）
- 其他任何使用 `cast(..., ARRAY(String))` 的地方

示例：
```python
# ❌ 错误
from sqlalchemy import String, cast
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
Material.elements.op("@>")(cast(["Fe"], PG_ARRAY(String)))

# ✅ 正确
from sqlalchemy import Text, cast
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
Material.elements.op("@>")(cast(["Fe"], PG_ARRAY(Text)))
```

同时确认 `app/models/material.py` 中所有 `ARRAY(String)` 也已改为 `ARRAY(Text)`：
```python
# ❌ 错误
elements: list[str] | None = Column(ARRAY(String))

# ✅ 正确
elements: list[str] | None = Column(ARRAY(Text))
```

需要修改的模型字段：
- `elements`
- `deprecation_reasons`
- `possible_species`
- `types_of_magnetic_species`

### 验证

```bash
curl -s "http://localhost:8000/api/v1/search/elements?elements=Fe,O&per_page=3"
```

期望：返回 200，每条记录的 elements 数组都包含 "Fe" 和 "O"。
不能：返回 500 或报 `text[] @> character varying[]` 错误。

---

## 修复 2：字段投影 fields 参数（必须修复）

### 问题
`GET /api/v1/materials?fields=material_id,formula_pretty,band_gap` 中的 `fields` 参数当前未生效，返回的仍然是全部字段。70+ 字段中很多是大型 JSONB（structure、dos、bandstructure 等），列表查询如果返回全部字段会严重影响性能。

### 修复要求

在 `MaterialService` 的列表/搜索方法中，当 `fields` 参数不为空时，**动态构建 select 的列列表**，只查询指定字段。

实现逻辑：

```python
# app/services/material_service.py

from app.models.material import Material

# 允许投影的字段白名单（防止注入）
ALLOWED_FIELDS = {col.key for col in Material.__table__.columns}

def _build_select(self, fields: str | None):
    """根据 fields 参数构建 select 语句"""
    if not fields:
        # 默认返回 Summary 级别的字段，排除大型 JSONB
        return select(Material)
    
    requested = [f.strip() for f in fields.split(",")]
    # 白名单过滤
    valid_fields = [f for f in requested if f in ALLOWED_FIELDS]
    
    if not valid_fields:
        return select(Material)
    
    # 确保 material_id 始终包含（作为主键/标识）
    if "material_id" not in valid_fields:
        valid_fields.insert(0, "material_id")
    
    columns = [getattr(Material, f) for f in valid_fields]
    return select(*columns)
```

然后在 `list_materials` 和 `search` 方法中调用 `_build_select(fields)` 替代 `select(Material)`。

**注意**：当使用 `select(*columns)` 而非 `select(Material)` 时，返回的是 `Row` 对象而不是 `Material` ORM 实例。需要手动转为 dict：

```python
result = await self.db.execute(query)
if fields:
    # Row 对象转 dict
    rows = [dict(row._mapping) for row in result]
else:
    rows = result.scalars().all()
```

### 验证

```bash
# 只请求 3 个字段
curl -s "http://localhost:8000/api/v1/materials?per_page=2&fields=material_id,formula_pretty,band_gap"
```

期望：每条记录**只包含** material_id、formula_pretty、band_gap 三个字段（加上可能的 null 值）。

```bash
# 不传 fields，应该返回 Summary 级别的字段
curl -s "http://localhost:8000/api/v1/materials?per_page=2"
```

期望：返回约 15 个核心字段，**不包含** structure、dos、bandstructure 等大型 JSONB 字段。

---

## 修复 3：列表查询默认排除大型 JSONB 字段（建议修复）

### 问题
即使不传 `fields` 参数，列表查询也不应该返回 `structure`、`dos`、`bandstructure`、`raw_data`、`cif` 等大字段。这些字段单条记录可能有几十 KB，列表页返回 20 条就是几百 KB 到几 MB，严重浪费带宽。

### 修复要求

定义一个"列表默认字段"常量，在不传 `fields` 时使用：

```python
# app/services/material_service.py

# 列表页默认返回的字段（排除大型 JSONB 和 TEXT）
DEFAULT_LIST_FIELDS = [
    "material_id", "formula_pretty", "formula_anonymous", "elements",
    "nelements", "chemsys", "nsites", "volume", "density",
    "crystal_system",  # 注意：这个字段在 symmetry JSONB 中，不是独立列
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
```

在列表查询中：
```python
def _build_select(self, fields: str | None):
    if fields:
        # 用户指定了字段
        ...（修复 2 的逻辑）
    else:
        # 默认：排除大型字段
        columns = [
            getattr(Material, f) for f in DEFAULT_LIST_FIELDS
            if hasattr(Material, f)
        ]
        return select(*columns)
```

注意：`crystal_system` 不是 materials 表的独立列，它存在于 `symmetry` JSONB 中。如果需要在列表中展示晶系，有两种方案：
- 方案 A：列表查询中用 SQL 提取 `symmetry->>'crystal_system'`
- 方案 B：从 DEFAULT_LIST_FIELDS 中去掉 crystal_system，列表不展示晶系

建议先用方案 B，简单可靠。

### 验证

```bash
curl -s "http://localhost:8000/api/v1/materials?per_page=2" | python -m json.tool
```

期望：
- 返回的记录中**没有** structure、dos、raw_data 等大字段
- 响应大小明显减小（几 KB 而非几百 KB）

可以用这个命令对比响应大小：
```bash
# 列表（应该很小）
curl -s "http://localhost:8000/api/v1/materials?per_page=10" | wc -c

# 详情（可以很大）
curl -s "http://localhost:8000/api/v1/materials/mp-1001012" | wc -c
```

---

## 修复完成后的完整验证

按顺序跑以下命令，全部通过即为 02 阶段完成：

```bash
# 1. 列表 — 返回默认字段，无大型 JSONB
curl -s "http://localhost:8000/api/v1/materials?per_page=3" | python -m json.tool

# 2. 字段投影 — 只返回指定字段
curl -s "http://localhost:8000/api/v1/materials?per_page=2&fields=material_id,band_gap" | python -m json.tool

# 3. 详情 — 返回全部字段
curl -s "http://localhost:8000/api/v1/materials/mp-1001012" | python -m json.tool

# 4. 元素搜索 — 无类型报错
curl -s "http://localhost:8000/api/v1/search/elements?elements=Fe,O&per_page=3" | python -m json.tool

# 5. 高级搜索组合
curl -s "http://localhost:8000/api/v1/materials/search/advanced?is_stable=true&band_gap_min=0.5&band_gap_max=3.0&per_page=3" | python -m json.tool

# 6. 统计
curl -s "http://localhost:8000/api/v1/statistics/summary" | python -m json.tool

# 7. 404
curl -s "http://localhost:8000/api/v1/materials/fake-id-999" | python -m json.tool

# 8. 分页边界
curl -s "http://localhost:8000/api/v1/materials?page=0" | python -m json.tool
```
