import { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Space, Input, Button, Typography, Row, Col, Card, Collapse, Checkbox, Select, InputNumber, Divider, Radio } from 'antd';
import type { TablePaginationConfig, SorterResult, FilterValue } from 'antd/es/table/interface';
import { useSearchParams } from 'react-router-dom';
import { useSearch } from '../../hooks/useSearch';
import { formatFormula } from '../../utils/format';
import type { MaterialSummary } from '../../types/material';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { RARE_EARTH_ELEMENTS, RARE_EARTH_NAMES } from '../../utils/constants';

const { Title } = Typography;
const { Panel } = Collapse;

// 晶系选项
const CRYSTAL_SYSTEM_OPTIONS = [
  'Cubic',
  'Hexagonal',
  'Tetragonal',
  'Orthorhombic',
  'Monoclinic',
  'Triclinic',
  'Trigonal',
];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  // 从 URL 读取所有过滤参数
  const page = Number(searchParams.get('page')) || 1;
  const per_page = Number(searchParams.get('per_page')) || 20;
  const sort_field = searchParams.get('sort_field') || 'material_id';
  const sort_order = (searchParams.get('sort_order') as 'asc' | 'desc') || 'asc';

  // 过滤参数
  const formula = searchParams.get('formula') || undefined;
  const elements = searchParams.get('elements') || undefined;
  const band_gap_min = searchParams.get('band_gap_min') ? Number(searchParams.get('band_gap_min')) : undefined;
  const band_gap_max = searchParams.get('band_gap_max') ? Number(searchParams.get('band_gap_max')) : undefined;
  const is_metal = searchParams.get('is_metal') === 'true' ? true :
                   searchParams.get('is_metal') === 'false' ? false : undefined;
  const is_stable = searchParams.get('is_stable') === 'true' ? true :
                    searchParams.get('is_stable') === 'false' ? false : undefined;
  const crystal_system = searchParams.get('crystal_system') || undefined;
  const is_magnetic = searchParams.get('is_magnetic') === 'true' ? true :
                      searchParams.get('is_magnetic') === 'false' ? false : undefined;
  const contains_rare_earth = searchParams.get('contains_rare_earth') === 'true' ? true :
                              searchParams.get('contains_rare_earth') === 'false' ? false : undefined;
  const rare_earth_type = searchParams.get('rare_earth_type') || undefined;

  const params = {
    page,
    per_page,
    sort_field,
    sort_order,
    formula,
    elements,
    band_gap_min,
    band_gap_max,
    is_metal,
    is_stable,
    crystal_system,
    is_magnetic,
    contains_rare_earth,
    rare_earth_type,
  };

  const { data, isLoading } = useSearch(params);

  // 更新 active filters 显示
  useEffect(() => {
    const filters: Record<string, any> = {};
    if (formula) filters.formula = formula;
    if (elements) filters.elements = elements;
    if (band_gap_min !== undefined) filters.band_gap_min = band_gap_min;
    if (band_gap_max !== undefined) filters.band_gap_max = band_gap_max;
    if (is_metal !== undefined) filters.is_metal = is_metal;
    if (is_stable !== undefined) filters.is_stable = is_stable;
    if (crystal_system) filters.crystal_system = crystal_system;
    if (is_magnetic !== undefined) filters.is_magnetic = is_magnetic;
    if (contains_rare_earth !== undefined) filters.contains_rare_earth = contains_rare_earth;
    if (rare_earth_type) filters.rare_earth_type = rare_earth_type;
    setActiveFilters(filters);
  }, [formula, elements, band_gap_min, band_gap_max, is_metal, is_stable, crystal_system, is_magnetic, contains_rare_earth, rare_earth_type]);

  // 更新 URL 参数
  const updateSearchParams = useCallback((newParams: Record<string, any>) => {
    const p = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        p.delete(key);
      } else {
        p.set(key, String(value));
      }
    });
    p.set('page', '1'); // 重置页码
    setSearchParams(p);
  }, [searchParams, setSearchParams]);

  // 移除单个过滤条件
  const removeFilter = (key: string) => {
    const p = new URLSearchParams(searchParams);
    p.delete(key);
    setSearchParams(p);
  };

  // 清除所有过滤条件
  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  // 分页/排序变化处理
  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, FilterValue | null>,
    sorter: SorterResult<MaterialSummary> | SorterResult<MaterialSummary>[],
  ) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(pagination.current || 1));
    newParams.set('per_page', String(pagination.pageSize || 20));

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
      key: 'material_id',
      sorter: true,
      render: (id: string) => (
        <a href={`/materials/${id}`}>{id}</a>
      ),
      width: 120,
    },
    {
      title: 'Formula',
      dataIndex: 'formula_pretty',
      key: 'formula_pretty',
      sorter: true,
      render: (formula: string | null) => formatFormula(formula),
      width: 120,
    },
    {
      title: 'Elements',
      dataIndex: 'elements',
      key: 'elements',
      render: (elements: string[] | null) =>
        elements?.map((el) => <Tag key={el}>{el}</Tag>) ?? '-',
      width: 150,
    },
    {
      title: 'Crystal System',
      dataIndex: 'crystal_system',
      key: 'crystal_system',
      sorter: true,
      width: 120,
    },
    {
      title: 'Band Gap (eV)',
      dataIndex: 'band_gap',
      key: 'band_gap',
      sorter: true,
      render: (v: number | null) => v?.toFixed(3) ?? '-',
      width: 110,
    },
    {
      title: 'Stable',
      dataIndex: 'is_stable',
      key: 'is_stable',
      render: (v: boolean | null) =>
        v === null ? '-' : v ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>,
      width: 80,
    },
    {
      title: 'Metal',
      dataIndex: 'is_metal',
      key: 'is_metal',
      render: (v: boolean | null) =>
        v === null ? '-' : v ? <Tag color="orange">Yes</Tag> : <Tag color="blue">No</Tag>,
      width: 80,
    },
  ];

  // 过滤条件标签格式化
  const formatFilterLabel = (key: string, value: unknown) => {
    switch (key) {
      case 'formula':
        return `Formula: ${value}`;
      case 'elements':
        return `Elements: ${value}`;
      case 'band_gap_min':
        return `Band Gap ≥ ${value} eV`;
      case 'band_gap_max':
        return `Band Gap ≤ ${value} eV`;
      case 'is_metal':
        return `Metal: ${value ? 'Yes' : 'No'}`;
      case 'is_stable':
        return `Stable: ${value ? 'Yes' : 'No'}`;
      case 'crystal_system':
        return `Crystal System: ${value}`;
      case 'is_magnetic':
        return `Magnetic: ${value ? 'Yes' : 'No'}`;
      case 'contains_rare_earth':
        return `Contains Rare Earth: ${value ? 'Yes' : 'No'}`;
      case 'rare_earth_type':
        return `Rare Earth Type: ${value === 'light' ? 'Light' : value === 'heavy' ? 'Heavy' : value}`;
      default:
        return `${key}: ${value}`;
    }
  };

  return (
    <div>
      <Title level={2}>高级搜索</Title>

      {/* 当前过滤条件标签 */}
      {Object.keys(activeFilters).length > 0 && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space align="center" style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>当前过滤:</span>
            {Object.entries(activeFilters).map(([key, value]) => (
              <Tag
                key={key}
                closable
                onClose={() => removeFilter(key)}
                color="blue"
                style={{ marginRight: 8 }}
              >
                {formatFilterLabel(key, value)}
              </Tag>
            ))}
            <Button type="link" size="small" onClick={clearAllFilters} icon={<ClearOutlined />}>
              清除全部
            </Button>
          </Space>
        </Card>
      )}

      <Row gutter={24}>
        {/* 左侧过滤面板 */}
        <Col xs={24} md={8} lg={6}>
          <Card title="过滤条件" size="small">
            <Collapse defaultActiveKey={['composition', 'electronic']}>
              {/* 化学组成 */}
              <Panel header="化学组成" key="composition">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <div style={{ marginBottom: 4 }}>化学式</div>
                    <Input
                      placeholder="如 Fe2O3"
                      value={formula || ''}
                      onChange={(e) => updateSearchParams({ formula: e.target.value })}
                      allowClear
                    />
                  </div>
                  <div>
                    <div style={{ marginBottom: 4 }}>元素（逗号分隔）</div>
                    <Input
                      placeholder="如 Fe,O,Si"
                      value={elements || ''}
                      onChange={(e) => updateSearchParams({ elements: e.target.value })}
                      allowClear
                    />
                  </div>
                </Space>
              </Panel>

              {/* 电子结构 */}
              <Panel header="电子结构" key="electronic">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <div style={{ marginBottom: 4 }}>能带间隙范围 (eV)</div>
                    <Space>
                      <InputNumber
                        placeholder="最小值"
                        value={band_gap_min}
                        onChange={(v) => updateSearchParams({ band_gap_min: v })}
                        min={0}
                        step={0.1}
                        style={{ width: '100px' }}
                      />
                      <span>—</span>
                      <InputNumber
                        placeholder="最大值"
                        value={band_gap_max}
                        onChange={(v) => updateSearchParams({ band_gap_max: v })}
                        min={0}
                        step={0.1}
                        style={{ width: '100px' }}
                      />
                    </Space>
                  </div>
                  <Checkbox
                    checked={is_metal === true}
                    indeterminate={is_metal === undefined}
                    onChange={() => {
                      const current = is_metal;
                      const next = current === undefined ? true : current === true ? false : undefined;
                      updateSearchParams({ is_metal: next });
                    }}
                  >
                    金属材料
                  </Checkbox>
                </Space>
              </Panel>

              {/* 稳定性 */}
              <Panel header="稳定性" key="stability">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Checkbox
                    checked={is_stable === true}
                    indeterminate={is_stable === undefined}
                    onChange={() => {
                      const current = is_stable;
                      const next = current === undefined ? true : current === true ? false : undefined;
                      updateSearchParams({ is_stable: next });
                    }}
                  >
                    热力学稳定
                  </Checkbox>
                </Space>
              </Panel>

              {/* 磁性 */}
              <Panel header="磁性" key="magnetism">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Checkbox
                    checked={is_magnetic === true}
                    indeterminate={is_magnetic === undefined}
                    onChange={() => {
                      const current = is_magnetic;
                      const next = current === undefined ? true : current === true ? false : undefined;
                      updateSearchParams({ is_magnetic: next });
                    }}
                  >
                    磁性材料
                  </Checkbox>
                </Space>
              </Panel>

              {/* 结构 */}
              <Panel header="结构" key="structure">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <div style={{ marginBottom: 4 }}>晶系</div>
                    <Select
                      placeholder="选择晶系"
                      value={crystal_system}
                      onChange={(v) => updateSearchParams({ crystal_system: v })}
                      allowClear
                      style={{ width: '100%' }}
                      options={CRYSTAL_SYSTEM_OPTIONS.map(sys => ({ label: sys, value: sys }))}
                    />
                  </div>
                </Space>
              </Panel>

              {/* 稀土筛选 */}
              <Panel header="稀土筛选" key="rare_earth">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Checkbox
                    checked={contains_rare_earth === true}
                    indeterminate={contains_rare_earth === undefined}
                    onChange={() => {
                      const current = contains_rare_earth;
                      const next = current === undefined ? true : current === true ? false : undefined;
                      updateSearchParams({ contains_rare_earth: next });
                    }}
                  >
                    仅显示含稀土材料
                  </Checkbox>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ marginBottom: 4 }}>稀土类型</div>
                    <Radio.Group
                      value={rare_earth_type || ''}
                      onChange={(e) => updateSearchParams({ rare_earth_type: e.target.value || undefined })}
                      style={{ width: '100%' }}
                    >
                      <Radio.Button value="">全部</Radio.Button>
                      <Radio.Button value="light">轻稀土</Radio.Button>
                      <Radio.Button value="heavy">重稀土</Radio.Button>
                    </Radio.Group>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ marginBottom: 4 }}>单个稀土元素</div>
                    <Space wrap>
                      {RARE_EARTH_ELEMENTS.map(element => (
                        <Tag.CheckableTag
                          key={element}
                          checked={elements?.includes(element) || false}
                          onChange={(checked) => {
                            const currentElements = elements ? elements.split(',').map(e => e.trim()) : [];
                            let newElements: string[];
                            if (checked) {
                              newElements = [...currentElements, element];
                            } else {
                              newElements = currentElements.filter(e => e !== element);
                            }
                            updateSearchParams({ elements: newElements.length > 0 ? newElements.join(',') : undefined });
                          }}
                          style={{ marginBottom: 4 }}
                        >
                          {element} {RARE_EARTH_NAMES[element]}
                        </Tag.CheckableTag>
                      ))}
                    </Space>
                  </div>
                </Space>
              </Panel>
            </Collapse>

            <Divider style={{ margin: '16px 0' }} />

            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => { /* 搜索已在参数变化时自动触发 */ }}
                disabled={isLoading}
              >
                搜索
              </Button>
              <Button
                icon={<ClearOutlined />}
                onClick={clearAllFilters}
              >
                重置
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 右侧结果表格 */}
        <Col xs={24} md={16} lg={18}>
          <Card title={`搜索结果 (${data?.meta.total || 0} 条)`}>
            <Table
              rowKey="material_id"
              columns={columns}
              dataSource={data?.data}
              loading={isLoading}
              pagination={{
                current: page,
                pageSize: per_page,
                total: data?.meta.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条材料`,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              onChange={handleTableChange}
              size="middle"
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}