# 材料晶体数据库 — 总体实施计划（改进版）

## 与原计划的主要改进

### 架构改进
1. **后端**: 保留 FastAPI，但增加 **Redis 缓存层**（40K+ 数据必须缓存高频查询）
2. **前端**: React 18 + TypeScript + Vite，但用 **Ant Design (antd)** 替代 MUI — antd 的 Table/ProTable 组件对数据密集型场景更成熟，且内置虚拟滚动
3. **状态管理**: 用 **TanStack Query (React Query)** 替代 Zustand/Context — 天然适合服务端状态管理、缓存、分页
4. **API 设计**: 采用 **字段投影 (field projection)** 机制，而非简单的"基础/详细"两级 — 70+ 字段需要按需取用

### 功能改进
1. 增加 **元素周期表交互选择器** 作为核心搜索入口
2. 增加 **晶体结构 3D 可视化**（Three.js）
3. 增加 **材料对比功能**（选中多个材料并排比较）
4. 增加 **URL 持久化搜索状态**（搜索条件编码到 URL，方便分享）

### 性能改进
1. 数据库层: 增加 **物化视图** 用于统计聚合
2. API 层: 增加 **Redis 缓存** + **ETag / 条件请求**
3. 前端: **虚拟滚动** + **按需加载字段** + **搜索防抖**

---

## 项目结构

```
material-db-app/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置管理
│   │   ├── database.py          # 数据库连接
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── material.py      # SQLAlchemy 模型
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── material.py      # Pydantic 响应模型
│   │   │   └── search.py        # 搜索参数模型
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── router.py        # 路由注册
│   │   │   ├── materials.py     # 材料 CRUD 端点
│   │   │   ├── search.py        # 搜索端点
│   │   │   └── statistics.py    # 统计端点
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── material_service.py
│   │   │   └── cache_service.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── pagination.py
│   │       └── filters.py
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── alembic.ini
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/                 # API 调用层
│   │   │   ├── client.ts        # axios 实例
│   │   │   └── materials.ts     # 材料相关 API
│   │   ├── hooks/               # 自定义 hooks
│   │   │   ├── useMaterials.ts
│   │   │   └── useSearch.ts
│   │   ├── pages/
│   │   │   ├── MaterialList.tsx
│   │   │   ├── MaterialDetail.tsx
│   │   │   ├── Search.tsx
│   │   │   └── Statistics.tsx
│   │   ├── components/
│   │   │   ├── PeriodicTable/
│   │   │   ├── MaterialTable/
│   │   │   ├── FilterPanel/
│   │   │   ├── StructureViewer/
│   │   │   └── Charts/
│   │   ├── types/
│   │   │   └── material.ts
│   │   └── utils/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 实施顺序（按文件编号执行）

| 步骤 | 指导文件 | 内容 | 预计时间 |
|------|----------|------|----------|
| 1 | `01-BACKEND-DATABASE.md` | 数据库模型 + 连接 + 配置 | 0.5 天 |
| 2 | `02-BACKEND-API.md` | FastAPI 端点 + Pydantic Schema | 1.5 天 |
| 3 | `03-BACKEND-SEARCH.md` | 高级搜索 + 过滤 + 分页 | 1 天 |
| 4 | `04-FRONTEND-SETUP.md` | 前端项目初始化 + 路由 + API 层 | 0.5 天 |
| 5 | `05-FRONTEND-PAGES.md` | 核心页面实现 | 2 天 |
| 6 | `06-FRONTEND-COMPONENTS.md` | 可复用组件（周期表、图表等） | 1.5 天 |
| 7 | `07-DOCKER-DEPLOY.md` | 容器化 + 部署 | 0.5 天 |

**总计: 约 7.5 天**

---

## 技术栈确认

| 组件 | 技术 | 版本 |
|------|------|------|
| 后端框架 | FastAPI | 0.110+ |
| ORM | SQLAlchemy 2.0 | async |
| 数据库驱动 | asyncpg | - |
| 数据验证 | Pydantic v2 | - |
| 缓存 | Redis (可选) | 7+ |
| 前端框架 | React 18 | + TypeScript 5 |
| 构建工具 | Vite 5 | - |
| UI 组件库 | Ant Design 5 | - |
| 数据请求 | TanStack Query v5 | - |
| HTTP 客户端 | axios | - |
| 图表 | ECharts / Recharts | - |
| 3D 可视化 | Three.js (可选) | - |
| 路由 | React Router v6 | - |
| 容器化 | Docker + Compose | - |
