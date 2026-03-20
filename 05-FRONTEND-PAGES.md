# 05 — 前端：核心页面实现

## 目标
实现四个核心页面：材料列表、材料详情、高级搜索、数据统计。

---

## 1. 材料列表页 (`pages/MaterialList/index.tsx`)

### 设计要点
- 使用 antd `Table` 组件，支持服务端分页、排序
- 表格列需精选（不能把 70 个字段全列出来）
- 点击行跳转到详情页
- 顶部添加快速过滤栏

### 默认显示列

| 列 | 字段 | 宽度 | 说明 |
|---|---|---|---|
| Material ID | `material_id` | 120px | 链接到详情 |
| Formula | `formula_pretty` | 120px | 化学式 |
| Elements | `elements` | 150px | Tag 展示 |
| Crystal System | `crystal_system` | 120px | - |
| Space Group | `space_group_symbol` | 100px | - |
| Band Gap (eV) | `band_gap` | 110px | 数值，保留 3 位小数 |
| Stable | `is_stable` | 80px | 绿色✓/红色✗ |
| E above Hull | `energy_above_hull` | 130px | 数值 |
| Density | `density` | 100px | g/cm³ |
| Sites | `nsites` | 70px | 整数 |

### 实现关键

```typescript
import { Table, Tag, Space, Input, Button } from 'antd';
import type { TablePaginationConfig, SorterResult } from 'antd/es/table/interface';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMaterials } from '../../hooks/useMaterials';

export default function MaterialList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // 从 URL 读取分页/排序/过滤状态
  const params = {
    page: Number(searchParams.get('page')) || 1,
    per_page: Number(searchParams.get('per_page')) || 20,
    sort_field: searchParams.get('sort_field') || 'material_id',
    sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'asc',
    // 其他过滤参数也从 URL 读取
    is_stable: searchParams.get('is_stable') === 'true' ? true : 
               searchParams.get('is_stable') === 'false' ? false : undefined,
    // ... 更多过滤参数
  };

  const { data, isLoading } = useMaterials(params);

  // 分页/排序变化时更新 URL
  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: any,
    sorter: SorterResult<any> | SorterResult<any>[],
  ) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(pagination.current));
    newParams.set('per_page', String(pagination.pageSize));
    
    if (!Array.isArray(sorter) && sorter.field) {
      newParams.set('sort_field', String(sorter.field));
      newParams.set('sort_order', sorter.order === 'descend' ? 'desc' : 'asc');
    }
    
    setSearchParams(newParams);
  };

  const columns = [
    {
      title: 'Material ID',
      dataIndex: 'material_id',
      sorter: true,
      render: (id: string) => (
        <a onClick={() => navigate(`/materials/${id}`)}>{id}</a>
      ),
    },
    {
      title: 'Formula',
      dataIndex: 'formula_pretty',
      sorter: true,
    },
    {
      title: 'Elements',
      dataIndex: 'elements',
      render: (elements: string[] | null) =>
        elements?.map((el) => <Tag key={el}>{el}</Tag>) ?? '-',
    },
    {
      title: 'Band Gap (eV)',
      dataIndex: 'band_gap',
      sorter: true,
      render: (v: number | null) => v?.toFixed(3) ?? '-',
    },
    {
      title: 'Stable',
      dataIndex: 'is_stable',
      render: (v: boolean | null) =>
        v === null ? '-' : v ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>,
    },
    // ... 其余列
  ];

  return (
    <div>
      {/* 快速过滤栏 */}
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search formula..."
          onSearch={(v) => {
            const p = new URLSearchParams(searchParams);
            if (v) p.set('formula', v); else p.delete('formula');
            p.set('page', '1');
            setSearchParams(p);
          }}
          style={{ width: 250 }}
        />
        {/* 更多快速过滤器 */}
      </Space>

      <Table
        rowKey="material_id"
        columns={columns}
        dataSource={data?.data}
        loading={isLoading}
        pagination={{
          current: params.page,
          pageSize: params.per_page,
          total: data?.meta.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条材料`,
        }}
        onChange={handleTableChange}
        size="middle"
        scroll={{ x: 1200 }}
      />
    </div>
  );
}
```

**关键**: 所有搜索状态写入 URL searchParams，这样页面可以刷新恢复状态、可以分享链接。

---

## 2. 材料详情页 (`pages/MaterialDetail/index.tsx`)

### 设计要点
- 使用 antd `Descriptions` + `Card` + `Tabs` 组织信息
- 按属性类别分 Tab 展示
- 顶部显示核心信息卡片
- JSONB 字段（如 structure、lattice）用格式化 JSON 展示或表格展示

### 页面结构

```
┌──────────────────────────────────────────┐
│  ← Back    mp-1234  |  Fe2O3             │  面包屑 + 标题
├──────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ Band Gap│ │ Density │ │ Stable  │    │  核心指标卡片
│  │  2.1 eV │ │ 5.24    │ │   Yes   │    │
│  └─────────┘ └─────────┘ └─────────┘    │
├──────────────────────────────────────────┤
│  [基础信息] [电子结构] [磁性] [力学] ... │  Tabs
│                                          │
│  Descriptions 组件展示当前 Tab 的字段     │
│                                          │
└──────────────────────────────────────────┘
```

### Tab 分组

| Tab 名称 | 包含字段 |
|----------|---------|
| 基础信息 | formula, elements, chemsys, nsites, volume, density, crystal_system, space_group, lattice |
| 热力学 | energy_per_atom, energy_above_hull, formation_energy, is_stable, decomposes_to |
| 电子结构 | band_gap, cbm, vbm, efermi, is_metal, is_gap_direct |
| 磁性 | is_magnetic, ordering, total_magnetization, magnetic_species |
| 力学性质 | bulk_modulus, shear_modulus, anisotropy, poisson |
| 介电性质 | e_total, e_ionic, e_electronic, n |
| 表面性质 | surface_energy, work_function, surface_anisotropy, shape_factor |
| 原始数据 | database_IDs, last_updated, deprecated, warnings |

### 实现要点

```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Card, Tabs, Spin, Tag, Statistic, Row, Col, Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useMaterialDetail } from '../../hooks/useMaterials';

export default function MaterialDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: material, isLoading, error } = useMaterialDetail(id!);

  if (isLoading) return <Spin size="large" />;
  if (error || !material) return <div>Material not found</div>;

  return (
    <div>
      {/* 顶部导航 */}
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} type="link">
        返回列表
      </Button>
      <Typography.Title level={3}>
        {material.material_id} — {material.formula_pretty}
      </Typography.Title>

      {/* 核心指标卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card><Statistic title="Band Gap" value={material.band_gap ?? '-'} suffix="eV" precision={3} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="Density" value={material.density ?? '-'} suffix="g/cm³" precision={2} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="Volume" value={material.volume ?? '-'} suffix="ų" precision={2} /></Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic 
              title="Stable" 
              value={material.is_stable ? 'Yes' : 'No'}
              valueStyle={{ color: material.is_stable ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="Sites" value={material.nsites ?? '-'} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="E above Hull" value={material.energy_above_hull ?? '-'} suffix="eV" precision={4} /></Card>
        </Col>
      </Row>

      {/* 详细信息 Tabs */}
      <Tabs defaultActiveKey="basic" items={[
        {
          key: 'basic',
          label: '基础信息',
          children: (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Chemical Formula">{material.formula_pretty}</Descriptions.Item>
              <Descriptions.Item label="Elements">
                {material.elements?.map(e => <Tag key={e}>{e}</Tag>)}
              </Descriptions.Item>
              <Descriptions.Item label="Crystal System">{material.crystal_system}</Descriptions.Item>
              <Descriptions.Item label="Space Group">{material.space_group_symbol}</Descriptions.Item>
              {/* ... 更多字段 */}
            </Descriptions>
          ),
        },
        {
          key: 'electronic',
          label: '电子结构',
          children: (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Band Gap">{material.band_gap?.toFixed(3)} eV</Descriptions.Item>
              <Descriptions.Item label="CBM">{material.cbm?.toFixed(3)} eV</Descriptions.Item>
              <Descriptions.Item label="VBM">{material.vbm?.toFixed(3)} eV</Descriptions.Item>
              <Descriptions.Item label="Fermi Energy">{material.efermi?.toFixed(3)} eV</Descriptions.Item>
              <Descriptions.Item label="Is Metal">{material.is_metal ? 'Yes' : 'No'}</Descriptions.Item>
              <Descriptions.Item label="Direct Gap">{material.is_gap_direct ? 'Yes' : 'No'}</Descriptions.Item>
            </Descriptions>
          ),
        },
        // ... 其余 tabs
      ]} />
    </div>
  );
}
```

---

## 3. 高级搜索页 (`pages/Search/index.tsx`)

### 设计要点
- 左侧过滤面板 + 右侧结果表格
- 过滤面板按类别折叠（Collapse）
- 搜索条件变化时自动查询（防抖 300ms）
- 当前搜索条件以 Tag 形式展示在表格上方

### 布局

```
┌─────────────────────────────────────────────────┐
│  高级搜索                                        │
├──────────┬──────────────────────────────────────┤
│ 过滤面板  │  当前过滤: [Fe] [band_gap: 0-3] [x]   │
│          │                                      │
│ ▼ 元素选择│  ┌────────────────────────────────┐  │
│  [周期表] │  │    搜索结果 Table              │  │
│          │  │    (同材料列表页的 Table)        │  │
│ ▼ 电子结构│  │                                │  │
│  Band Gap │  │                                │  │
│  [0] - [5]│  │                                │  │
│  □ Metal  │  │                                │  │
│          │  └────────────────────────────────┘  │
│ ▼ 稳定性  │                                      │
│  □ Stable │  共找到 1,234 条结果                   │
│          │                                      │
│ ▼ 结构   │                                      │
│  晶系下拉 │                                      │
│          │                                      │
│ [重置] [搜│                                      │
│ 索]      │                                      │
└──────────┴──────────────────────────────────────┘
```

### 过滤面板分组

```typescript
// 过滤面板的折叠组
const filterGroups = [
  {
    key: 'composition',
    label: '化学组成',
    fields: [
      { type: 'periodic-table', name: 'elements', label: '包含元素' },
      { type: 'input', name: 'formula', label: '化学式' },
      { type: 'input', name: 'chemsys', label: '化学体系' },
      { type: 'range-int', name: 'nelements', label: '元素数量' },
    ],
  },
  {
    key: 'electronic',
    label: '电子结构',
    fields: [
      { type: 'range-float', name: 'band_gap', label: 'Band Gap (eV)', min: 0, max: 15 },
      { type: 'checkbox', name: 'is_metal', label: '金属' },
      { type: 'checkbox', name: 'is_gap_direct', label: '直接带隙' },
    ],
  },
  {
    key: 'stability',
    label: '稳定性',
    fields: [
      { type: 'checkbox', name: 'is_stable', label: '热力学稳定' },
      { type: 'range-float', name: 'energy_above_hull', label: 'E above Hull (eV)', min: 0, max: 1, onlyMax: true },
    ],
  },
  {
    key: 'magnetism',
    label: '磁性',
    fields: [
      { type: 'checkbox', name: 'is_magnetic', label: '磁性材料' },
      { type: 'select', name: 'ordering', label: '磁序', options: ['FM', 'AFM', 'FiM', 'NM'] },
    ],
  },
  {
    key: 'structure',
    label: '结构',
    fields: [
      { type: 'select', name: 'crystal_system', label: '晶系',
        options: ['cubic', 'hexagonal', 'tetragonal', 'orthorhombic', 'monoclinic', 'triclinic', 'trigonal'] },
      { type: 'range-int', name: 'nsites', label: '原子数' },
      { type: 'range-float', name: 'volume', label: '体积 (ų)' },
      { type: 'range-float', name: 'density', label: '密度 (g/cm³)' },
    ],
  },
];
```

---

## 4. 数据统计页 (`pages/Statistics/index.tsx`)

### 展示内容

四个主要图表 + 一个总览卡片：

1. **总览卡片**: 材料总数、稳定材料比例、金属比例、磁性材料比例
2. **带隙分布**: 直方图 (ECharts bar chart)
3. **元素频率 Top 20**: 水平柱状图
4. **晶系分布**: 饼图
5. **稳定性 vs 带隙**: 散点图（可选，较复杂）

### 统计 API hooks (`src/hooks/useStatistics.ts`)

```typescript
export function useSummary() {
  return useQuery({
    queryKey: ['statistics', 'summary'],
    queryFn: () => statisticsApi.getSummary(),
    staleTime: 30 * 60 * 1000, // 统计数据缓存 30 分钟
  });
}

export function useBandGapDistribution(bins = 50) {
  return useQuery({
    queryKey: ['statistics', 'band_gap', bins],
    queryFn: () => statisticsApi.getBandGapDistribution(bins),
    staleTime: 30 * 60 * 1000,
  });
}
```

---

## 5. 公共工具 (`src/utils/format.ts`)

```typescript
// 数值格式化
export function formatFloat(value: number | null | undefined, decimals = 3): string {
  if (value === null || value === undefined) return '-';
  return value.toFixed(decimals);
}

// 化学式格式化（下标数字）—— 返回 React 元素
export function formatFormula(formula: string | null): React.ReactNode {
  if (!formula) return '-';
  // 将数字包裹在 <sub> 标签中
  return formula.split(/(\d+)/).map((part, i) =>
    /^\d+$/.test(part) ? <sub key={i}>{part}</sub> : part
  );
}

// 布尔值展示
export function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return value ? 'Yes' : 'No';
}
```

---

## 验收标准

- [ ] 材料列表页：分页、排序、基础过滤功能正常
- [ ] 材料详情页：所有 Tab 正确展示对应字段
- [ ] 高级搜索页：多条件组合搜索返回正确结果
- [ ] 数据统计页：四个图表正确渲染
- [ ] URL 状态持久化：刷新页面后搜索条件恢复
- [ ] 空数据和加载状态有友好提示
- [ ] null 字段显示 "-" 而不是 "null" 或空白

## 常见错误提醒

1. antd Table 的 `onChange` 回调的 sorter 可能是数组（多列排序），要处理
2. `useSearchParams` 的值都是字符串，boolean 需要手动转换
3. ECharts 在 React 中必须在 `useEffect` 中初始化，且要处理 resize
4. `Descriptions.Item` 的 children 如果是 `null` 会报 warning，用 `?? '-'` 处理
5. 化学式中的数字应该显示为下标，不要直接展示纯文本
