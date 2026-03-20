# 01 — 后端：数据库模型与连接

## 目标
建立 FastAPI 项目骨架，定义 SQLAlchemy 异步模型映射到已有的 `materials` 表。

---

## 1. 项目初始化

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn[standard] sqlalchemy[asyncio] asyncpg pydantic pydantic-settings redis alembic python-dotenv
pip freeze > requirements.txt
```

## 2. 配置管理 (`app/config.py`)

使用 Pydantic Settings，从 `.env` 文件读取配置。**必须**包含以下字段：

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 数据库
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/materials_db"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    
    # Redis 缓存 (可选)
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL: int = 300  # 秒
    
    # API
    API_PREFIX: str = "/api/v1"
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    
    class Config:
        env_file = ".env"
```

## 3. 数据库连接 (`app/database.py`)

**关键要求**:
- 使用 `create_async_engine`，**不要**用同步引擎
- 配置连接池参数
- 提供 `get_db` 依赖注入

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,  # 检测断连
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

## 4. SQLAlchemy 模型 (`app/models/material.py`)

**关键约束**:
- 这是一个**已存在**的表，模型必须精确映射，不要试图创建或修改表结构
- 使用 `__tablename__ = "materials"` 
- JSONB 字段用 `JSONB` 类型
- ARRAY 字段用 `ARRAY(String)` 或 `ARRAY(Float)` 等
- 所有字段都应该是 `Optional`（数据库中很多字段可为 null）

### 字段分组（按业务领域）

模型中的字段按以下分类组织，**每组用注释分隔**：

```python
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

class Material(Base):
    __tablename__ = "materials"
    
    # ===== 标识信息 =====
    material_id = Column(String, primary_key=True)  # e.g. "mp-1234"
    formula_pretty = Column(String, index=True)
    formula_anonymous = Column(String)
    
    # ===== 成分信息 =====
    elements = Column(ARRAY(String))  # ["Fe", "O"]
    nelements = Column(Integer)
    chemsys = Column(String, index=True)  # "Fe-O"
    composition = Column(JSONB)
    composition_reduced = Column(JSONB)
    
    # ===== 结构信息 =====
    structure = Column(JSONB)           # 完整晶体结构
    lattice = Column(JSONB)             # 晶格参数
    volume = Column(Float)
    density = Column(Float)
    density_atomic = Column(Float)
    nsites = Column(Integer)
    
    # ===== 对称性 =====
    symmetry = Column(JSONB)
    crystal_system = Column(String)     # "cubic", "hexagonal" 等
    space_group_number = Column(Integer)
    space_group_symbol = Column(String)
    point_group = Column(String)
    
    # ===== 热力学性质 =====
    energy_per_atom = Column(Float)
    energy_above_hull = Column(Float, index=True)
    formation_energy_per_atom = Column(Float)
    is_stable = Column(Boolean, index=True)
    equilibrium_reaction_energy_per_atom = Column(Float)
    decomposes_to = Column(JSONB)
    
    # ===== 电子结构 =====
    band_gap = Column(Float, index=True)
    cbm = Column(Float)                 # 导带底
    vbm = Column(Float)                 # 价带顶
    efermi = Column(Float)
    is_gap_direct = Column(Boolean)
    is_metal = Column(Boolean)
    bandstructure = Column(JSONB)
    dos = Column(JSONB)
    
    # ===== 磁性 =====
    is_magnetic = Column(Boolean)
    ordering = Column(String)
    total_magnetization = Column(Float)
    total_magnetization_normalized_vol = Column(Float)
    total_magnetization_normalized_formula_units = Column(Float)
    num_magnetic_sites = Column(Integer)
    num_unique_magnetic_sites = Column(Integer)
    types_of_magnetic_species = Column(ARRAY(String))
    
    # ===== 力学性质 =====
    bulk_modulus = Column(JSONB)
    shear_modulus = Column(JSONB)
    universal_anisotropy = Column(Float)
    homogeneous_poisson = Column(Float)
    
    # ===== 介电性质 =====
    e_total = Column(Float)
    e_ionic = Column(Float)
    e_electronic = Column(Float)
    n = Column(Float)                   # 折射率
    
    # ===== 表面性质 =====
    weighted_surface_energy_EV_PER_ANG2 = Column(Float)
    weighted_surface_energy = Column(Float)
    weighted_work_function = Column(Float)
    surface_anisotropy = Column(Float)
    shape_factor = Column(Float)
    has_reconstructed = Column(Boolean)
    
    # ===== 元数据 =====
    database_IDs = Column(JSONB)
    last_updated = Column(DateTime)
    origins = Column(JSONB)
    warnings = Column(ARRAY(String))
    deprecated = Column(Boolean)
    deprecation_reasons = Column(JSONB)
```

> **注意**: 上面的字段列表是参考性的。实际实现时必须查看 `ALL_INFO.sql` 中的真实表结构，确保字段名、类型完全匹配。如果 SQL 中的列名与上面不同，以 SQL 为准。

## 5. 启动入口 (`app/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时: 可选的预热操作
    yield
    # 关闭时: 清理连接
    await engine.dispose()

app = FastAPI(
    title="Crystal Materials Database API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(materials_router, prefix=settings.API_PREFIX)
```

## 6. 验收标准

- [ ] `uvicorn app.main:app --reload` 能启动
- [ ] `/docs` 能打开 Swagger UI
- [ ] 数据库连接成功（可以写一个 `/health` 端点测试）
- [ ] 模型定义与实际表结构一致（字段名、类型）

---

## 常见错误提醒

1. **不要** 使用 `metadata.create_all()` — 表已存在，不需要创建
2. **不要** 在模型中添加关系 (relationship) — 这是单表应用
3. JSONB 字段不要尝试自定义 TypeDecorator，直接用 `JSONB` 即可
4. `asyncpg` 需要 `postgresql+asyncpg://` 而不是 `postgresql://`
5. 连接池 `pool_pre_ping=True` 是必须的，防止 idle 连接被数据库断开
