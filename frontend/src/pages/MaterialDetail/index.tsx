import { useParams, useNavigate } from 'react-router-dom';
import {
  Descriptions,
  Card,
  Tabs,
  Spin,
  Tag,
  Statistic,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Alert
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useMaterialDetail } from '../../hooks/useMaterials';
import { formatFormula, formatFloat, formatBoolean } from '../../utils/format';
import CrystalViewer from '../../components/CrystalViewer';
import { RARE_EARTH_ELEMENTS, LIGHT_RE, HEAVY_RE, RARE_EARTH_NAMES } from '../../utils/constants';

const { Title } = Typography;
const { TabPane } = Tabs;

const MaterialDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: material, isLoading, error } = useMaterialDetail(id || '');

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !material) {
    return (
      <Alert
        message="Material Not Found"
        description={`Material with ID "${id}" could not be found.`}
        type="error"
        action={
          <Button type="primary" onClick={() => navigate('/materials')}>
            Back to Material List
          </Button>
        }
      />
    );
  }

  const renderElements = (elements: string[] | null) => {
    if (!elements || elements.length === 0) return '-';
    return (
      <Space wrap>
        {elements.map((el) => (
          <Tag
            key={el}
            color={RARE_EARTH_ELEMENTS.includes(el) ? 'gold' : 'blue'}
            style={RARE_EARTH_ELEMENTS.includes(el) ? { fontWeight: 600 } : {}}
          >
            {el}
          </Tag>
        ))}
      </Space>
    );
  };

  // 检测稀土元素
  const hasRareEarth = material.elements?.some(el => RARE_EARTH_ELEMENTS.includes(el)) ?? false;
  const hasLightRE = material.elements?.some(el => LIGHT_RE.includes(el)) ?? false;
  const hasHeavyRE = material.elements?.some(el => HEAVY_RE.includes(el)) ?? false;
  const rareEarthElements = material.elements?.filter(el => RARE_EARTH_ELEMENTS.includes(el)) ?? [];

  // 颜色编码辅助函数
  const getBandGapColor = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '#999';
    if (value === 0) return '#8c8c8c'; // 金属
    if (value < 1) return '#cf1322';   // 窄带隙
    if (value <= 3) return '#3f8600';  // 半导体
    return '#1a3a5c';                  // 绝缘体
  };

  const getEnergyAboveHullColor = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '#999';
    if (value === 0) return '#3f8600';     // 稳定
    if (value <= 0.05) return '#d4a017';   // 亚稳
    return '#cf1322';                      // 不稳定
  };

  // 核心指标卡片数据
  const coreMetrics = [
    {
      title: 'Band Gap',
      value: material.band_gap,
      suffix: 'eV',
      precision: 3,
      valueStyle: { color: getBandGapColor(material.band_gap) }
    },
    { title: 'Density', value: material.density, suffix: 'g/cm³', precision: 2 },
    { title: 'Volume', value: material.volume, suffix: 'Å³', precision: 2 },
    {
      title: 'Stable',
      value: material.is_stable === true ? 'Yes' : 'No',
      valueStyle: { color: material.is_stable ? '#3f8600' : '#cf1322' }
    },
    { title: 'Sites', value: material.nsites, suffix: '', precision: 0 },
    {
      title: 'E above Hull',
      value: material.energy_above_hull,
      suffix: 'eV',
      precision: 4,
      valueStyle: { color: getEnergyAboveHullColor(material.energy_above_hull) }
    },
  ];

  return (
    <div>
      {/* 顶部导航 */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        type="link"
        style={{ marginBottom: 16 }}
      >
        Back to List
      </Button>
      <Title level={3}>
        {material.material_id} — {formatFormula(material.formula_pretty)}
        {hasRareEarth && (
          <Space style={{ marginLeft: 16 }}>
            <Tag color="gold" style={{ fontWeight: 600, fontSize: '14px' }}>
              稀土材料
            </Tag>
            {hasLightRE && (
              <Tag color="orange" style={{ fontSize: '14px' }}>
                轻稀土
              </Tag>
            )}
            {hasHeavyRE && (
              <Tag color="cyan" style={{ fontSize: '14px' }}>
                重稀土
              </Tag>
            )}
            {rareEarthElements.length > 0 && (
              <Tag color="default" style={{ fontSize: '14px' }}>
                {rareEarthElements.map(el => RARE_EARTH_NAMES[el] || el).join(', ')}
              </Tag>
            )}
          </Space>
        )}
      </Title>

      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {coreMetrics.map((metric, idx) => (
          <Col xs={24} sm={12} md={8} lg={4} key={idx}>
            <Card size="small">
              <Statistic
                title={metric.title}
                value={metric.value ?? '-'}
                suffix={metric.suffix}
                precision={metric.precision as any}
                valueStyle={metric.valueStyle}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 晶胞结构图 - 主展示区 */}
      {material.cif && (
        <Card
          title="Unit Cell Structure"
          style={{ marginBottom: 24 }}
          extra={<Tag color="blue">Interactive 3D</Tag>}
        >
          <Alert
            message="Drag to rotate, scroll to zoom, right-click to pan"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <CrystalViewer
            cif={material.cif}
            height="500px"
            backgroundColor="#fafafa"
          />
          <div style={{ marginTop: 16, textAlign: 'center', color: '#666' }}>
            <small>显示晶体结构中原子位置与键连关系。CIF数据已存储在数据库中。</small>
          </div>
        </Card>
      )}

      {/* 详细信息 Tabs */}
      <Tabs defaultActiveKey="basic" size="large">
        <TabPane tab="Basic Information" key="basic">
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Chemical Formula">
              {formatFormula(material.formula_pretty)}
            </Descriptions.Item>
            <Descriptions.Item label="Elements">
              {renderElements(material.elements)}
            </Descriptions.Item>
            <Descriptions.Item label="Chemical System">
              {material.chemsys || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Number of Elements">
              {material.nelements ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Crystal System">
              {material.crystal_system || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Space Group">
              {material.space_group_symbol || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Space Group Number">
              {material.space_group_number ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Point Group">
              {material.point_group || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Number of Sites">
              {material.nsites ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Volume">
              {material.volume ? `${formatFloat(material.volume, 2)} Å³` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Density">
              {material.density ? `${formatFloat(material.density, 2)} g/cm³` : '-'}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>

        <TabPane tab="Crystal Structure" key="crystal">
          <Card title="Unit Cell Visualization" style={{ marginBottom: 16 }}>
            <CrystalViewer cif={material.cif} />
          </Card>
          <Card title="CIF Data">
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', maxHeight: '400px', overflow: 'auto' }}>
              {material.cif || 'No CIF data available.'}
            </pre>
          </Card>
        </TabPane>

        <TabPane tab="Thermodynamic Properties" key="thermodynamic">
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Energy per Atom">
              {material.energy_per_atom ? `${formatFloat(material.energy_per_atom, 4)} eV` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Formation Energy per Atom">
              {material.formation_energy_per_atom ? `${formatFloat(material.formation_energy_per_atom, 4)} eV/atom` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Energy Above Hull">
              {material.energy_above_hull ? `${formatFloat(material.energy_above_hull, 4)} eV` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Stable">
              {formatBoolean(material.is_stable)}
            </Descriptions.Item>
            <Descriptions.Item label="Decomposes To">
              {material.decomposes_to ? JSON.stringify(material.decomposes_to) : '-'}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>

        <TabPane tab="Electronic Structure" key="electronic">
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Band Gap">
              {material.band_gap ? `${formatFloat(material.band_gap, 3)} eV` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Is Metal">
              {formatBoolean(material.is_metal)}
            </Descriptions.Item>
            <Descriptions.Item label="Conduction Band Minimum">
              {material.cbm ? `${formatFloat(material.cbm, 3)} eV` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Valence Band Maximum">
              {material.vbm ? `${formatFloat(material.vbm, 3)} eV` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Fermi Energy">
              {material.efermi ? `${formatFloat(material.efermi, 3)} eV` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Is Direct Gap">
              {formatBoolean(material.is_gap_direct)}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>

        <TabPane tab="Magnetic Properties" key="magnetic">
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Is Magnetic">
              {formatBoolean(material.is_magnetic)}
            </Descriptions.Item>
            <Descriptions.Item label="Ordering">
              {material.ordering || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Total Magnetization">
              {material.total_magnetization ? `${formatFloat(material.total_magnetization, 3)} μB` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Magnetic Species">
              {material.types_of_magnetic_species ? material.types_of_magnetic_species.join(', ') : '-'}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>

        <TabPane tab="Mechanical Properties" key="mechanical">
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Bulk Modulus">
              {material.bulk_modulus ? JSON.stringify(material.bulk_modulus) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Shear Modulus">
              {material.shear_modulus ? JSON.stringify(material.shear_modulus) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Universal Anisotropy">
              {material.universal_anisotropy ? formatFloat(material.universal_anisotropy) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Homogeneous Poisson">
              {material.homogeneous_poisson ? formatFloat(material.homogeneous_poisson) : '-'}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>

        <TabPane tab="Dielectric Properties" key="dielectric">
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Total Dielectric Constant">
              {material.e_total ? formatFloat(material.e_total) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Ionic Dielectric Constant">
              {material.e_ionic ? formatFloat(material.e_ionic) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Electronic Dielectric Constant">
              {material.e_electronic ? formatFloat(material.e_electronic) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Refractive Index">
              {material.n ? formatFloat(material.n, 3) : '-'}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>

        <TabPane tab="Surface Properties" key="surface">
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Weighted Surface Energy">
              {material.weighted_surface_energy ? `${formatFloat(material.weighted_surface_energy)} J/m²` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Weighted Work Function">
              {material.weighted_work_function ? `${formatFloat(material.weighted_work_function)} eV` : '-'}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>

        <TabPane tab="Metadata" key="metadata">
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Database IDs">
              {material.database_IDs ? JSON.stringify(material.database_IDs) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Last Updated">
              {material.last_updated || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Deprecated">
              {formatBoolean(material.deprecated)}
            </Descriptions.Item>
            <Descriptions.Item label="Warnings">
              {material.warnings ? material.warnings.join(', ') : '-'}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default MaterialDetail;