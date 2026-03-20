# 06 — 前端：可复用组件

## 目标
实现元素周期表选择器、过滤面板、属性卡片、图表组件等核心可复用组件。

---

## 1. 元素周期表选择器 (`components/PeriodicTable/PeriodicTable.tsx`)

### 功能
- 标准 18 列周期表布局
- 点击元素切换选中/取消
- 选中元素高亮显示
- 支持受控模式（`value` + `onChange`）

### 设计规范
- 每个元素格子约 40x40px
- 颜色编码按元素类别：碱金属、碱土金属、过渡金属、非金属、卤素、稀有气体、镧系、锕系
- 选中状态用深色边框 + 轻微放大效果

### 元素数据

```typescript
// src/utils/constants.ts
export interface ElementInfo {
  symbol: string;
  name: string;
  number: number;
  category: string;  // 'alkali-metal' | 'alkaline-earth' | 'transition-metal' | ...
  row: number;       // 周期表行 (1-9, 8-9 for lanthanides/actinides)
  col: number;       // 周期表列 (1-18)
}

// 118 个元素的完整数据，包含在表中的位置
// 注意：镧系元素放在 row=8, 锕系放在 row=9
export const ELEMENTS: ElementInfo[] = [
  { symbol: 'H', name: 'Hydrogen', number: 1, category: 'nonmetal', row: 1, col: 1 },
  { symbol: 'He', name: 'Helium', number: 2, category: 'noble-gas', row: 1, col: 18 },
  { symbol: 'Li', name: 'Lithium', number: 3, category: 'alkali-metal', row: 2, col: 1 },
  // ... 完整的 118 个元素
];

// 元素类别颜色映射
export const CATEGORY_COLORS: Record<string, string> = {
  'alkali-metal': '#ff6b6b',
  'alkaline-earth': '#ffa94d',
  'transition-metal': '#ffd43b',
  'post-transition-metal': '#a9e34b',
  'metalloid': '#69db7c',
  'nonmetal': '#38d9a9',
  'halogen': '#4ecdc4',
  'noble-gas': '#74c0fc',
  'lanthanide': '#b197fc',
  'actinide': '#f783ac',
};
```

### 组件接口

```typescript
interface PeriodicTableProps {
  selectedElements: string[];             // 已选元素符号数组
  onChange: (elements: string[]) => void;  // 选择变化回调
  disabled?: boolean;
  size?: 'small' | 'default';            // small 用于搜索面板内嵌
}
```

### 实现要点

```typescript
export default function PeriodicTable({ selectedElements, onChange, size = 'default' }: PeriodicTableProps) {
  const cellSize = size === 'small' ? 32 : 42;
  
  const toggleElement = (symbol: string) => {
    if (selectedElements.includes(symbol)) {
      onChange(selectedElements.filter(e => e !== symbol));
    } else {
      onChange([...selectedElements, symbol]);
    }
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: `repeat(18, ${cellSize}px)`,
      gridTemplateRows: `repeat(9, ${cellSize}px)`,  // 9 行（含镧系锕系）
      gap: 2,
    }}>
      {ELEMENTS.map((el) => {
        const isSelected = selectedElements.includes(el.symbol);
        return (
          <div
            key={el.symbol}
            onClick={() => toggleElement(el.symbol)}
            style={{
              gridRow: el.row,
              gridColumn: el.col,
              width: cellSize,
              height: cellSize,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: isSelected 
                ? CATEGORY_COLORS[el.category] 
                : `${CATEGORY_COLORS[el.category]}40`,  // 40 = 25% opacity
              border: isSelected ? '2px solid #1677ff' : '1px solid #d9d9d9',
              borderRadius: 4,
              fontSize: size === 'small' ? 10 : 12,
              fontWeight: isSelected ? 700 : 400,
              transition: 'all 0.15s',
              transform: isSelected ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            <span style={{ fontSize: size === 'small' ? 8 : 9, color: '#888' }}>{el.number}</span>
            <span>{el.symbol}</span>
          </div>
        );
      })}
    </div>
  );
}
```

---

## 2. 过滤面板 (`components/FilterPanel/FilterPanel.tsx`)

### 功能
- 接收过滤条件配置，动态渲染表单
- 支持多种字段类型：range-float、range-int、checkbox、select、input、periodic-table
- 折叠面板（Collapse）按类别分组
- "重置"按钮清除所有过滤条件

### 组件接口

```typescript
interface FilterField {
  type: 'input' | 'range-float' | 'range-int' | 'checkbox' | 'select' | 'periodic-table';
  name: string;           // 对应 SearchParams 的键
  label: string;
  options?: string[];     // select 类型的选项
  min?: number;           // range 类型的最小值
  max?: number;           // range 类型的最大值
  step?: number;          // range 类型的步长
  onlyMax?: boolean;      // 只显示最大值输入（如 energy_above_hull）
}

interface FilterGroup {
  key: string;
  label: string;
  fields: FilterField[];
}

interface FilterPanelProps {
  groups: FilterGroup[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onReset: () => void;
}
```

### 各字段类型的渲染

```typescript
function renderField(field: FilterField, values: Record<string, any>, onChange: Function) {
  switch (field.type) {
    case 'input':
      return (
        <Input
          value={values[field.name] || ''}
          onChange={(e) => onChange({ ...values, [field.name]: e.target.value || undefined })}
          placeholder={`输入${field.label}`}
          allowClear
        />
      );

    case 'range-float':
    case 'range-int':
      return (
        <Space>
          <InputNumber
            value={values[`${field.name}_min`]}
            onChange={(v) => onChange({ ...values, [`${field.name}_min`]: v })}
            placeholder="Min"
            step={field.type === 'range-float' ? (field.step || 0.1) : 1}
            style={{ width: 100 }}
          />
          <span>—</span>
          <InputNumber
            value={values[`${field.name}_max`]}
            onChange={(v) => onChange({ ...values, [`${field.name}_max`]: v })}
            placeholder="Max"
            step={field.type === 'range-float' ? (field.step || 0.1) : 1}
            style={{ width: 100 }}
          />
        </Space>
      );

    case 'checkbox':
      return (
        <Checkbox
          checked={values[field.name] === true}
          indeterminate={values[field.name] === undefined}
          onChange={(e) => {
            // 三态：undefined -> true -> false -> undefined
            const current = values[field.name];
            const next = current === undefined ? true : current === true ? false : undefined;
            onChange({ ...values, [field.name]: next });
          }}
        >
          {field.label}
        </Checkbox>
      );

    case 'select':
      return (
        <Select
          value={values[field.name]}
          onChange={(v) => onChange({ ...values, [field.name]: v })}
          allowClear
          placeholder={`选择${field.label}`}
          options={field.options?.map(o => ({ label: o, value: o }))}
          style={{ width: '100%' }}
        />
      );

    case 'periodic-table':
      return (
        <PeriodicTable
          selectedElements={values[field.name]?.split(',').filter(Boolean) || []}
          onChange={(elements) => onChange({ 
            ...values, 
            [field.name]: elements.length > 0 ? elements.join(',') : undefined 
          })}
          size="small"
        />
      );
  }
}
```

---

## 3. 属性卡片 (`components/PropertyCard/PropertyCard.tsx`)

用于详情页展示单个属性值的小卡片：

```typescript
interface PropertyCardProps {
  title: string;
  value: string | number | null | undefined;
  unit?: string;
  precision?: number;
  colorCode?: 'positive-green' | 'negative-red' | 'none';
}

export default function PropertyCard({ title, value, unit, precision = 3, colorCode = 'none' }: PropertyCardProps) {
  const displayValue = typeof value === 'number' ? value.toFixed(precision) : (value ?? '-');
  
  const valueColor = colorCode === 'positive-green' && value 
    ? '#3f8600' 
    : colorCode === 'negative-red' && value 
    ? '#cf1322' 
    : undefined;

  return (
    <Card size="small" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: valueColor }}>
        {displayValue}
        {unit && <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>{unit}</span>}
      </div>
    </Card>
  );
}
```

---

## 4. 图表组件 (`components/Charts/`)

### 4.1 带隙分布直方图 (`BandGapChart.tsx`)

```typescript
import ReactECharts from 'echarts-for-react';

interface BandGapChartProps {
  data: Array<{ bucket: number; count: number; range_min: number; range_max: number }>;
  loading?: boolean;
}

export default function BandGapChart({ data, loading }: BandGapChartProps) {
  const option = {
    title: { text: 'Band Gap Distribution', left: 'center' },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const d = params[0];
        return `${d.data.range_min?.toFixed(2)} - ${d.data.range_max?.toFixed(2)} eV<br/>Count: ${d.data.count}`;
      },
    },
    xAxis: {
      type: 'category',
      name: 'Band Gap (eV)',
      data: data.map(d => d.range_min?.toFixed(1)),
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: 'value',
      name: 'Count',
    },
    series: [{
      type: 'bar',
      data: data.map(d => ({ value: d.count, ...d })),
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: '#1677ff' },
            { offset: 1, color: '#69b1ff' },
          ],
        },
      },
    }],
    grid: { left: 60, right: 20, bottom: 60, top: 60 },
  };

  return <ReactECharts option={option} style={{ height: 400 }} showLoading={loading} />;
}
```

### 4.2 元素频率柱状图 (`ElementFrequency.tsx`)

```typescript
// 水平柱状图，显示 Top N 常见元素
export default function ElementFrequency({ data, loading }: ElementFrequencyProps) {
  const option = {
    title: { text: 'Most Common Elements (Top 20)', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value', name: 'Count' },
    yAxis: { 
      type: 'category', 
      data: data.map(d => d.element).reverse(),
      axisLabel: { fontSize: 12 },
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.count).reverse(),
      itemStyle: { color: '#1677ff' },
    }],
    grid: { left: 60, right: 40, bottom: 40, top: 60 },
  };

  return <ReactECharts option={option} style={{ height: 500 }} showLoading={loading} />;
}
```

### 4.3 晶系分布饼图 (`CrystalSystemPie.tsx`)

```typescript
export default function CrystalSystemPie({ data, loading }: CrystalSystemPieProps) {
  const option = {
    title: { text: 'Crystal System Distribution', left: 'center' },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 'left', top: 'middle' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],  // 环形图
      avoidLabelOverlap: true,
      data: data.map(d => ({ name: d.crystal_system, value: d.count })),
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.3)' } },
      label: { formatter: '{b}\n{d}%' },
    }],
  };

  return <ReactECharts option={option} style={{ height: 400 }} showLoading={loading} />;
}
```

---

## 5. 材料对比组件 (`components/MaterialCompare/MaterialCompare.tsx`)

### 功能
- 选择 2-4 个材料并排对比
- 表格形式：行是属性，列是材料
- 差异值高亮

### 接口

```typescript
interface MaterialCompareProps {
  materialIds: string[];
  onRemove: (id: string) => void;
}

// 对比的属性分组
const compareProperties = [
  { group: '基础', props: [
    { key: 'formula_pretty', label: 'Formula' },
    { key: 'crystal_system', label: 'Crystal System' },
    { key: 'space_group_symbol', label: 'Space Group' },
    { key: 'nsites', label: 'Sites' },
    { key: 'volume', label: 'Volume (ų)', format: 'float' },
    { key: 'density', label: 'Density (g/cm³)', format: 'float' },
  ]},
  { group: '电子', props: [
    { key: 'band_gap', label: 'Band Gap (eV)', format: 'float' },
    { key: 'is_metal', label: 'Metal', format: 'boolean' },
    { key: 'is_gap_direct', label: 'Direct Gap', format: 'boolean' },
  ]},
  { group: '热力学', props: [
    { key: 'energy_above_hull', label: 'E above Hull (eV)', format: 'float' },
    { key: 'formation_energy_per_atom', label: 'Formation E (eV/atom)', format: 'float' },
    { key: 'is_stable', label: 'Stable', format: 'boolean' },
  ]},
];
```

---

## 6. 搜索条件 Tag 展示 (`components/ActiveFilters/ActiveFilters.tsx`)

展示当前活跃的过滤条件，点击 x 可移除：

```typescript
interface ActiveFiltersProps {
  params: Record<string, any>;
  onRemove: (key: string) => void;
  onClear: () => void;
}

export default function ActiveFilters({ params, onRemove, onClear }: ActiveFiltersProps) {
  const activeTags = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .filter(([k]) => !['page', 'per_page', 'sort_field', 'sort_order'].includes(k))
    .map(([key, value]) => ({
      key,
      label: formatFilterLabel(key, value),  // "Band Gap: 0 - 3 eV"
    }));

  if (activeTags.length === 0) return null;

  return (
    <Space wrap style={{ marginBottom: 12 }}>
      <span>当前过滤:</span>
      {activeTags.map(tag => (
        <Tag key={tag.key} closable onClose={() => onRemove(tag.key)} color="blue">
          {tag.label}
        </Tag>
      ))}
      <Button type="link" size="small" onClick={onClear}>清除全部</Button>
    </Space>
  );
}
```

---

## 验收标准

- [ ] 周期表：点击选择/取消元素正常，颜色编码正确
- [ ] 过滤面板：所有字段类型正常渲染和交互
- [ ] 三态 checkbox 正确（undefined/true/false 循环）
- [ ] 图表：数据正确渲染，交互（tooltip、缩放）正常
- [ ] 对比组件：多材料并排展示正确
- [ ] 所有组件的 loading 和 empty 状态处理

## 常见错误提醒

1. 周期表的 grid layout：镧系和锕系需要偏移，不要用简单的序号排列
2. ECharts 组件在容器 resize 时需要调用 `resize()`，用 ResizeObserver 监听
3. 过滤面板的防抖：不要在每次 InputNumber 变化时都发请求，用 `useDebouncedValue`
4. 颜色编码的元素类别数据要完整，不要遗漏元素
5. 饼图数据量少于 3 个类别时考虑用柱状图替代
