# 05-FIX — 三个问题修复

## 问题 1：晶系搜索结果始终为 0

crystal_system 和 space_group 不是 materials 表的独立列，它们存在于 `symmetry` JSONB 字段中。

请先执行以下 SQL 确认 symmetry 的实际结构：

```sql
SELECT symmetry FROM materials WHERE symmetry IS NOT NULL LIMIT 1;
```

然后根据返回的 JSON 结构，修复 `backend/app/utils/filters.py` 中 `add_crystal_system` 和 `add_space_group_number` 方法，确保 JSONB 的 key 路径与数据库中实际存储的一致。

同时检查前端搜索面板的晶系下拉选项值（如 "Cubic" vs "cubic"）是否与数据库中存储的值大小写完全匹配。

修复后验证：
```bash
curl -s "http://localhost:8000/api/v1/search/materials?crystal_system=<数据库中的实际值>&per_page=3"
```
结果的 meta.total 必须大于 0。

---

## 问题 2：统计页加载失败

前端请求统计 API 返回错误。请按以下步骤排查：

1. 先用 curl 逐个测试后端统计端点是否正常：
```bash
curl -s "http://localhost:8000/api/v1/statistics/summary"
curl -s "http://localhost:8000/api/v1/statistics/band_gap_distribution"
curl -s "http://localhost:8000/api/v1/statistics/elements_frequency"
curl -s "http://localhost:8000/api/v1/statistics/crystal_systems"
```

2. 如果某个端点返回 500，查看 uvicorn 终端的报错日志并修复后端代码。

3. 如果后端正常但前端仍报错，检查 `frontend/src/api/statistics.ts` 中的请求路径是否与后端路由完全一致。

4. 检查 `frontend/src/hooks/useStatistics.ts` 和统计页面组件中对响应数据的解构方式是否与后端实际返回的 JSON 结构匹配（注意 axios 响应在 `response.data` 中）。

修复后刷新统计页面，4 个图表必须全部正常渲染。

---

## 问题 3：材料库表格显示无效的 Crystal System 和 Space Group 列

crystal_system 和 space_group_symbol 不是 materials 表的独立列，后端列表 API 的 DEFAULT_LIST_FIELDS 中不包含这两个字段，所以返回的数据中没有它们。

修复方式二选一：

**方案 A（简单）**：前端材料库表格中删除 Crystal System 和 Space Group 这两列。

**方案 B（完整）**：后端列表 API 中用 SQL 从 symmetry JSONB 提取这两个值作为额外列返回。在 `backend/app/services/material_service.py` 的 `_build_select` 方法中，给默认查询添加：
```python
from sqlalchemy import literal_column

# 在 select 的列列表中追加：
Material.symmetry['crystal_system'].astext.label('crystal_system'),
Material.symmetry['number'].astext.label('space_group_number'),
```
注意 JSONB 中的 key 名必须和数据库中实际存储的一致（先用问题 1 中的 SQL 确认）。

请选择方案 B 实现，这样前端表格可以继续展示晶系和空间群信息。

修复后验证：
```bash
curl -s "http://localhost:8000/api/v1/materials?per_page=2"
```
返回的每条记录中必须包含 crystal_system 和 space_group_number 字段。
