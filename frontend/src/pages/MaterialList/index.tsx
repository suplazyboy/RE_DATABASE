import { Table, Tag, Space, Input, Button, Typography } from 'antd';
import type { TablePaginationConfig, SorterResult, FilterValue } from 'antd/es/table/interface';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMaterials } from '../../hooks/useMaterials';
import { formatFormula } from '../../utils/format';
import type { MaterialSummary } from '../../types/material';

const { Title } = Typography;

export default function MaterialList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // 从 URL 读取分页/排序/过滤状态
  const page = Number(searchParams.get('page')) || 1;
  const per_page = Number(searchParams.get('per_page')) || 20;
  const sort_field = searchParams.get('sort_field') || 'material_id';
  const sort_order = (searchParams.get('sort_order') as 'asc' | 'desc') || 'asc';
  const formula = searchParams.get('formula') || undefined;
  const is_stable = searchParams.get('is_stable') === 'true' ? true :
                    searchParams.get('is_stable') === 'false' ? false : undefined;

  const params = {
    page,
    per_page,
    sort_field,
    sort_order,
    formula,
    is_stable,
    // 可以添加更多过滤参数
  };

  const { data, isLoading } = useMaterials(params);

  // 分页/排序变化时更新 URL
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
        <a onClick={() => navigate(`/materials/${id}`)}>{id}</a>
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
      title: 'Space Group',
      dataIndex: 'space_group_symbol',
      key: 'space_group_symbol',
      width: 100,
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
      title: 'E above Hull',
      dataIndex: 'energy_above_hull',
      key: 'energy_above_hull',
      sorter: true,
      render: (v: number | null) => v?.toFixed(4) ?? '-',
      width: 130,
    },
    {
      title: 'Density',
      dataIndex: 'density',
      key: 'density',
      sorter: true,
      render: (v: number | null) => v?.toFixed(2) ?? '-',
      width: 100,
    },
    {
      title: 'Sites',
      dataIndex: 'nsites',
      key: 'nsites',
      sorter: true,
      render: (v: number | null) => v ?? '-',
      width: 70,
    },
  ];

  return (
    <div>
      <Title level={2}>材料库</Title>

      {/* 快速过滤栏 */}
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search formula..."
          defaultValue={formula}
          onSearch={(v) => {
            const p = new URLSearchParams(searchParams);
            if (v) p.set('formula', v); else p.delete('formula');
            p.set('page', '1');
            setSearchParams(p);
          }}
          style={{ width: 250 }}
        />
        <Button
          type={is_stable === true ? 'primary' : 'default'}
          onClick={() => {
            const p = new URLSearchParams(searchParams);
            if (is_stable === true) {
              p.delete('is_stable');
            } else {
              p.set('is_stable', 'true');
            }
            p.set('page', '1');
            setSearchParams(p);
          }}
        >
          Stable Only
        </Button>
        <Button
          type={is_stable === false ? 'primary' : 'default'}
          onClick={() => {
            const p = new URLSearchParams(searchParams);
            if (is_stable === false) {
              p.delete('is_stable');
            } else {
              p.set('is_stable', 'false');
            }
            p.set('page', '1');
            setSearchParams(p);
          }}
        >
          Unstable Only
        </Button>
        <Button
          onClick={() => {
            setSearchParams(new URLSearchParams());
          }}
        >
          Clear Filters
        </Button>
      </Space>

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
        scroll={{ x: 1200 }}
      />
    </div>
  );
}