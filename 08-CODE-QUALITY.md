# 08 — 代码质量规范与 Claude Code 使用指南

## 目标
确保 Claude Code 生成的代码一致、高质量、可维护。本文件应作为每次与 Claude Code 交互时的系统提示参考。

---

## 1. 通用编码规范

### Python (后端)
- 使用 Python 3.11+ 语法特性（`str | None` 而非 `Optional[str]`）
- 类型注解必须完整 — 函数参数和返回值都要标注
- 异步函数用 `async def`，不要混用同步和异步
- import 排序: stdlib → third-party → local，用空行分隔
- 字符串用双引号（与 Black 默认一致）
- 使用 f-string，不用 `.format()` 或 `%`

### TypeScript (前端)
- 严格模式 (`strict: true` in tsconfig)
- 不要用 `any`，用 `unknown` 或具体类型
- 组件用函数式组件 + hooks，不要用 class 组件
- Props 接口命名: `ComponentNameProps`
- 文件命名: 组件用 PascalCase (`MaterialList.tsx`)，工具用 camelCase (`format.ts`)
- 导出: 组件用 `export default`，工具函数用 named export

### 共通
- 每个文件头部不要写无意义注释（如 `// This file contains...`）
- 错误消息要有上下文，不要用 `"Error occurred"`
- 魔法数字提取为常量
- 一个函数做一件事，超过 50 行考虑拆分

---

## 2. 项目特定规范

### API 端点
- URL 路径用复数名词: `/materials`, `/statistics`
- 查询参数用 snake_case: `band_gap_min`, `sort_order`
- 响应始终包含完整类型提示
- 错误响应统一格式: `{"detail": "错误描述"}`
- 分页参数: `page`(1-indexed) + `per_page`

### 数据库查询
- **必须**使用 SQLAlchemy 2.0 `select()` 语法
- **禁止**使用 `.query()` 旧语法
- **禁止**使用原生 SQL 字符串拼接（防注入）
- 统计查询可以用 `text()` 包裹的原生 SQL，但参数必须用 `:param` 绑定
- 所有数据库操作都在 Service 层，不在路由层

### React 组件
- 状态管理: 服务端状态用 TanStack Query，客户端状态用 useState/useReducer
- 副作用: 用 useEffect 但要写清除函数
- 列表渲染: 必须有稳定的 `key`
- 条件渲染: 用 `&&` 或三元，不要在 JSX 中写 if-else
- 事件处理: 用 `useCallback` 包裹传递给子组件的回调

---

## 3. 与 Claude Code 交互的最佳实践

### 任务拆分原则
- 一次只让 Claude Code 做一个明确的任务
- 大文件分步构建：先骨架，再填充细节
- 新功能完成后先测试，再进入下一个

### Prompt 模板

**创建新文件时**:
```
请创建 `backend/app/models/material.py`，按照 01-BACKEND-DATABASE.md 中的规范：
- SQLAlchemy 异步模型
- 映射已有的 materials 表
- 字段按业务分组并添加注释
- 所有字段 Optional
参考 ALL_INFO.sql 中的实际表结构。
```

**修改现有文件时**:
```
请修改 `backend/app/api/materials.py`：
- 添加 `fields` 查询参数支持字段投影
- 参考 02-BACKEND-API.md 中的规范
- 不要改动现有的分页和排序逻辑
```

**调试时**:
```
运行 `pytest tests/test_materials.py` 后出现以下错误：
[粘贴错误信息]
请分析原因并修复。修复后重新运行测试确认通过。
```

### 避免的反模式
- ❌ "帮我把整个后端写完" — 太大，质量不可控
- ❌ "随便写个搜索功能" — 缺乏具体要求
- ❌ 不给上下文就让改 bug — Claude Code 需要看到相关代码
- ✅ "按照 03-BACKEND-SEARCH.md 实现 FilterBuilder 类" — 明确、有规范参考

---

## 4. 测试要求

### 后端测试 (`backend/tests/`)

```python
# conftest.py — 测试数据库配置
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

# test_materials.py
@pytest.mark.asyncio
async def test_list_materials(client):
    response = await client.get("/api/v1/materials")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "meta" in data
    assert data["meta"]["page"] == 1

@pytest.mark.asyncio
async def test_get_material_not_found(client):
    response = await client.get("/api/v1/materials/nonexistent-id")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_search_by_elements(client):
    response = await client.get("/api/v1/search/materials?elements=Fe,O")
    assert response.status_code == 200
    data = response.json()
    for material in data["data"]:
        assert "Fe" in material["elements"]
        assert "O" in material["elements"]
```

### 前端测试
- 组件测试: 至少覆盖关键交互（点击、输入、提交）
- Hook 测试: 验证 API 调用参数正确
- 不要测试 antd 组件内部行为

---

## 5. Git 工作流

### Commit 规范
```
feat: 添加材料搜索过滤器
fix: 修复分页数据不刷新的问题
refactor: 重构 FilterBuilder 为独立模块
docs: 更新 API 文档
style: 格式化代码
test: 添加搜索端点测试
```

### 分支策略
```
main           — 稳定版本
├── dev        — 开发分支
│   ├── feat/backend-api
│   ├── feat/frontend-list
│   └── fix/search-pagination
```

---

## 6. 性能检查清单

### 后端
- [ ] 所有列表查询有分页（不允许不带 limit 的全表查询）
- [ ] 高频查询走索引（用 EXPLAIN ANALYZE 验证）
- [ ] JSONB 字段在列表查询中不返回（仅详情页）
- [ ] 统计查询有缓存或物化视图
- [ ] 数据库连接池配置合理（pool_size ≥ worker 数）

### 前端
- [ ] TanStack Query 配置了 staleTime（避免重复请求）
- [ ] 表格使用 `keepPreviousData` 避免翻页闪烁
- [ ] 大列表使用虚拟滚动（如果超过 100 行可见）
- [ ] 搜索输入有防抖（300ms）
- [ ] 图表组件使用 React.memo 避免不必要重渲染
- [ ] 图片和字体按需加载

---

## 7. 安全检查清单

- [ ] 数据库密码不在代码中硬编码，使用环境变量
- [ ] API 无 SQL 注入风险（所有查询参数化）
- [ ] CORS 配置限制了允许的来源
- [ ] 排序字段做白名单校验
- [ ] 分页 per_page 有上限（max 100）
- [ ] 导出功能有速率限制（防止滥用）
