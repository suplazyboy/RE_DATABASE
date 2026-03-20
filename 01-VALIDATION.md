# 01-VALIDATION — 数据库模型与连接的验证清单

## 前置条件
- PostgreSQL 已运行，`materials` 表已存在且有数据
- 后端依赖已安装 (`pip install -r requirements.txt`)
- `.env` 文件已配置正确的 `DATABASE_URL`

---

## 第一步：项目能否启动

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**检查项**:
- [ ] 无 ImportError / ModuleNotFoundError
- [ ] 终端显示 `Uvicorn running on http://0.0.0.0:8000`
- [ ] 无数据库连接报错（如 `asyncpg.exceptions.InvalidPasswordError`）

**常见问题排查**:

| 报错 | 原因 | 修复 |
|------|------|------|
| `ModuleNotFoundError: No module named 'app'` | 运行目录不对 | 确保在 `backend/` 目录下运行 |
| `sqlalchemy.exc.ArgumentError: Could not parse rfc1738 URL` | DATABASE_URL 格式错误 | 必须是 `postgresql+asyncpg://user:pass@host:5432/dbname` |
| `asyncpg...Connection refused` | PostgreSQL 未启动或端口错 | 检查 PG 是否在运行、端口是否正确 |
| `asyncpg...password authentication failed` | 密码错误 | 检查 `.env` 中的账密 |

---

## 第二步：Swagger 文档可访问

浏览器打开 `http://localhost:8000/docs`

**检查项**:
- [ ] 页面正常渲染（不是 404 或空白页）
- [ ] 能看到 API 标题 "Crystal Materials Database API"

---

## 第三步：健康检查端点

先确保你的代码中有 `/health` 端点（如果还没有，先加一个）：

```python
# app/main.py 中添加
from sqlalchemy import text

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT 1"))
    row_count = await db.scalar(
        text("SELECT count(*) FROM materials")
    )
    return {
        "status": "healthy",
        "database": "connected",
        "materials_count": row_count,
    }
```

然后测试：

```bash
curl http://localhost:8000/health
```

**期望输出**:
```json
{
  "status": "healthy",
  "database": "connected",
  "materials_count": 40000  // 大约这个数量级
}
```

**检查项**:
- [ ] 返回 200
- [ ] `materials_count` > 0（确认数据存在）
- [ ] 响应时间 < 1s

---

## 第四步：模型字段与数据库一致性验证（最关键）

这是最容易出错的地方——SQLAlchemy 模型的字段名/类型可能与实际表结构不匹配。

### 方法 A：自动化脚本验证

创建一个验证脚本 `backend/scripts/validate_model.py`：

```python
"""
验证 SQLAlchemy 模型与实际数据库表结构的一致性。
运行: python -m scripts.validate_model
"""
import asyncio
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import Settings
from app.models.material import Material

settings = Settings()

async def validate():
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.connect() as conn:
        # 1. 获取数据库中的实际列
        result = await conn.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'materials'
            ORDER BY ordinal_position
        """))
        db_columns = {row[0]: {"type": row[1], "nullable": row[2]} for row in result}
        
        # 2. 获取模型定义的列
        model_columns = set()
        for attr_name in dir(Material):
            attr = getattr(Material, attr_name, None)
            if hasattr(attr, 'property') and hasattr(attr.property, 'columns'):
                col = attr.property.columns[0]
                model_columns.add(col.name)
        
        # 3. 对比
        db_col_names = set(db_columns.keys())
        
        missing_in_model = db_col_names - model_columns
        extra_in_model = model_columns - db_col_names
        matched = model_columns & db_col_names
        
        print(f"\n{'='*60}")
        print(f"数据库表 'materials' 共 {len(db_col_names)} 列")
        print(f"SQLAlchemy 模型共 {len(model_columns)} 列")
        print(f"匹配: {len(matched)} 列")
        print(f"{'='*60}")
        
        if missing_in_model:
            print(f"\n⚠️  数据库有但模型中缺少的列 ({len(missing_in_model)}):")
            for col in sorted(missing_in_model):
                info = db_columns[col]
                print(f"   - {col} ({info['type']})")
        
        if extra_in_model:
            print(f"\n❌ 模型有但数据库中不存在的列 ({len(extra_in_model)}):")
            for col in sorted(extra_in_model):
                print(f"   - {col}")
        
        if not missing_in_model and not extra_in_model:
            print("\n✅ 模型与数据库完全匹配！")
        
        # 4. 验证主键
        pk_result = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.key_column_usage
            WHERE table_name = 'materials'
              AND constraint_name LIKE '%pkey%'
        """))
        pk_columns = [row[0] for row in pk_result]
        print(f"\n主键列: {pk_columns}")
        
    await engine.dispose()

asyncio.run(validate())
```

运行：
```bash
cd backend
python -m scripts.validate_model
```

**检查项**:
- [ ] "模型有但数据库中不存在的列" 为 0 — 否则查询会报错
- [ ] "数据库有但模型中缺少的列" 数量可接受 — 少几个非关键列没关系，但核心字段不能缺
- [ ] 主键列与模型中的 `primary_key=True` 一致

### 方法 B：手动 SQL 对比

如果不想写脚本，直接在 psql 或任何 SQL 客户端中运行：

```sql
-- 查看所有列名和类型
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'materials'
ORDER BY ordinal_position;
```

然后肉眼与模型代码逐一比对。重点关注：
- 列名拼写是否完全一致（大小写、下划线）
- `jsonb` 列是否用了 `JSONB` 类型
- `ARRAY` 列是否用了 `ARRAY(String)` / `ARRAY(Float)` 等
- 主键列是否正确

---

## 第五步：ORM 查询测试

创建 `backend/scripts/test_query.py`：

```python
"""
测试基本的 ORM 查询能否正常工作。
运行: python -m scripts.test_query
"""
import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.config import Settings
from app.models.material import Material

settings = Settings()

async def test_queries():
    engine = create_async_engine(settings.DATABASE_URL)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with Session() as session:
        # 测试 1: 总数查询
        total = await session.scalar(select(func.count()).select_from(Material))
        print(f"✅ 总记录数: {total}")
        assert total > 0, "数据库为空！"
        
        # 测试 2: 取第一条记录
        result = await session.execute(select(Material).limit(1))
        first = result.scalar_one()
        print(f"✅ 第一条记录: {first.material_id} — {first.formula_pretty}")
        
        # 测试 3: 所有字段可读（不报序列化错误）
        assert first.material_id is not None, "material_id 不应为 None"
        print(f"   elements: {first.elements}")
        print(f"   band_gap: {first.band_gap}")
        print(f"   is_stable: {first.is_stable}")
        print(f"   crystal_system: {first.crystal_system}")
        
        # 测试 4: JSONB 字段可读
        print(f"   structure type: {type(first.structure)}")  # 应该是 dict 或 None
        print(f"   lattice type: {type(first.lattice)}")
        
        # 测试 5: ARRAY 字段可读
        if first.elements:
            assert isinstance(first.elements, list), f"elements 应该是 list，实际是 {type(first.elements)}"
            print(f"   elements (list): {first.elements}")
        
        # 测试 6: 过滤查询
        stable_count = await session.scalar(
            select(func.count()).select_from(Material).where(Material.is_stable == True)
        )
        print(f"✅ 稳定材料数: {stable_count}")
        
        # 测试 7: 排序 + 分页
        result = await session.execute(
            select(Material)
            .order_by(Material.band_gap.desc().nulls_last())
            .limit(5)
        )
        top5 = result.scalars().all()
        print(f"✅ Band gap 最大的 5 个材料:")
        for m in top5:
            print(f"   {m.material_id}: band_gap={m.band_gap}")
        
        # 测试 8: 元素数组过滤（如果有 GIN 索引）
        from sqlalchemy import cast
        from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
        from sqlalchemy import String
        
        result = await session.execute(
            select(func.count()).select_from(Material)
            .where(Material.elements.op("@>")(cast(["Fe", "O"], PG_ARRAY(String))))
        )
        fe_o_count = result.scalar()
        print(f"✅ 含 Fe 和 O 的材料数: {fe_o_count}")
        
    await engine.dispose()
    print(f"\n{'='*60}")
    print("🎉 所有查询测试通过！")

asyncio.run(test_queries())
```

运行：
```bash
cd backend
python -m scripts.test_query
```

**期望输出**:
```
✅ 总记录数: 40123
✅ 第一条记录: mp-1 — Cs
   elements: ['Cs']
   band_gap: 1.423
   is_stable: True
   crystal_system: cubic
   structure type: <class 'dict'>
   lattice type: <class 'dict'>
   elements (list): ['Cs']
✅ 稳定材料数: 12345
✅ Band gap 最大的 5 个材料:
   mp-xxx: band_gap=12.5
   ...
✅ 含 Fe 和 O 的材料数: 3456

============================================================
🎉 所有查询测试通过！
```

**检查项**:
- [ ] 所有 8 个测试通过
- [ ] JSONB 字段返回 `dict` 类型（不是字符串）
- [ ] ARRAY 字段返回 `list` 类型
- [ ] 排序中 null 值不会导致异常（用了 `nulls_last()`）
- [ ] 数组 `@>` 操作符正常工作

---

## 第六步：Pydantic 序列化测试

验证 ORM 对象能正确转换为 Pydantic 模型（这一步容易在后续 API 开发时才暴露问题，提前发现更好）：

```python
"""
测试 ORM 对象 → Pydantic Schema 的转换。
运行: python -m scripts.test_serialization
"""
import asyncio
import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.config import Settings
from app.models.material import Material
from app.schemas.material import MaterialSummary, MaterialDetail

settings = Settings()

async def test_serialization():
    engine = create_async_engine(settings.DATABASE_URL)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with Session() as session:
        result = await session.execute(select(Material).limit(5))
        materials = result.scalars().all()
        
        for m in materials:
            # 测试 Summary 序列化
            try:
                summary = MaterialSummary.model_validate(m)
                json_str = summary.model_dump_json()
                parsed = json.loads(json_str)
                print(f"✅ Summary OK: {m.material_id} → {len(json_str)} bytes")
            except Exception as e:
                print(f"❌ Summary FAIL: {m.material_id} → {e}")
            
            # 测试 Detail 序列化
            try:
                detail = MaterialDetail.model_validate(m)
                json_str = detail.model_dump_json()
                parsed = json.loads(json_str)
                print(f"✅ Detail OK:  {m.material_id} → {len(json_str)} bytes")
            except Exception as e:
                print(f"❌ Detail FAIL: {m.material_id} → {e}")
        
        print(f"\n示例 JSON 输出（第一条 Summary）:")
        first_summary = MaterialSummary.model_validate(materials[0])
        print(json.dumps(
            first_summary.model_dump(),
            indent=2, ensure_ascii=False, default=str
        ))
    
    await engine.dispose()

asyncio.run(test_serialization())
```

**检查项**:
- [ ] 5 条记录全部序列化成功
- [ ] JSON 输出中 `null` 字段正确显示为 `null`（不是 `"None"`）
- [ ] `datetime` 字段序列化为 ISO 格式字符串
- [ ] JSONB 字段序列化为嵌套 JSON 对象
- [ ] 无 `ValidationError`（字段类型不匹配会触发）

**常见序列化错误及修复**:

| 报错 | 原因 | 修复 |
|------|------|------|
| `ValidationError: value is not a valid dict` | JSONB 字段在数据库中存的是字符串而非 JSON | Schema 中用 `Any` 替代 `dict[str, Any]` |
| `datetime is not JSON serializable` | Pydantic 默认不处理 datetime 序列化 | 确保用 `model_dump_json()` 而不是 `json.dumps(model.model_dump())` |
| `Object of type Decimal is not JSON serializable` | 数据库中是 `numeric` 类型 | 在 Schema 中用 `float`，或配置 `json_encoders` |

---

## 验证完成标志

当以下全部通过时，01 阶段的代码可以认为正确：

```
✅ 服务启动无报错
✅ /health 返回正确的记录数
✅ 模型字段与数据库一致（无"数据库有但模型没有"的核心字段）
✅ 8 项 ORM 查询全部通过
✅ Pydantic 序列化 5 条记录全部成功
```

达成后即可进入 `02-BACKEND-API.md` 阶段。

---

## 给 Claude Code 的验证 Prompt 模板

```
请执行以下验证：
1. 启动后端服务，确认无报错
2. 运行 scripts/validate_model.py，对比模型与数据库的列
3. 运行 scripts/test_query.py，测试 8 项查询
4. 运行 scripts/test_serialization.py，测试 Pydantic 序列化
如果有任何失败，分析原因并修复后重新验证。
```
