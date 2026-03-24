import { Card, Row, Col, Typography, Statistic, Spin, Alert, Divider } from 'antd';
import ReactECharts from 'echarts-for-react';
import BandGapChart from '../../components/Charts/BandGapChart';
import ElementFrequencyChart from '../../components/Charts/ElementFrequencyChart';
import CrystalSystemPie from '../../components/Charts/CrystalSystemPie';
import {
  useSummary,
  useBandGapDistribution,
  useElementFrequency,
  useCrystalSystemDistribution,
  useStabilityDistribution,
  useRareEarthSummary,
  useRareEarthFrequency,
} from '../../hooks/useStatistics';
import { formatFloat } from '../../utils/format';

const { Title } = Typography;

export default function Statistics() {
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useSummary();
  const {
    data: bandGapData,
    isLoading: bandGapLoading,
    error: bandGapError,
  } = useBandGapDistribution();
  const {
    data: elementFrequencyData,
    isLoading: elementFrequencyLoading,
    error: elementFrequencyError,
  } = useElementFrequency();
  const {
    data: crystalSystemData,
    isLoading: crystalSystemLoading,
    error: crystalSystemError,
  } = useCrystalSystemDistribution();
  const {
    data: stabilityData,
    isLoading: stabilityLoading,
    error: stabilityError,
  } = useStabilityDistribution();

  const { data: reaSummary, isLoading: reaSummaryLoading } = useRareEarthSummary();
  const { data: reaFrequency, isLoading: reaFrequencyLoading } = useRareEarthFrequency();

  const isLoading = summaryLoading || bandGapLoading || elementFrequencyLoading || crystalSystemLoading || stabilityLoading;
  const hasError = summaryError || bandGapError || elementFrequencyError || crystalSystemError || stabilityError;

  if (hasError) {
    return (
      <Alert
        message="加载统计信息失败"
        description="请检查网络连接或稍后重试。"
        type="error"
        showIcon
      />
    );
  }

  // 转换稳定性数据为饼图格式
  const stabilityPieData = stabilityData ? [
    { crystal_system: 'Stable', count: stabilityData.stable },
    { crystal_system: 'Unstable', count: stabilityData.unstable },
    { crystal_system: 'Unknown', count: stabilityData.unknown }
  ] : [];

  return (
    <div>
      <Title level={2}>数据统计</Title>

      {/* 总览卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="材料总数"
              value={summary?.total_materials ?? 0}
              loading={summaryLoading}
              valueStyle={{ fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="稳定材料比例"
              value={summary?.stable_ratio ? formatFloat(summary.stable_ratio * 100, 1) : '0'}
              suffix="%"
              loading={summaryLoading}
              valueStyle={{ fontSize: 28, color: summary?.stable_ratio ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="金属材料比例"
              value={summary?.metal_ratio ? formatFloat(summary.metal_ratio * 100, 1) : '0'}
              suffix="%"
              loading={summaryLoading}
              valueStyle={{ fontSize: 28, color: summary?.metal_ratio ? '#faad14' : '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="磁性材料比例"
              value={summary?.magnetic_ratio ? formatFloat(summary.magnetic_ratio * 100, 1) : '0'}
              suffix="%"
              loading={summaryLoading}
              valueStyle={{ fontSize: 28, color: summary?.magnetic_ratio ? '#722ed1' : '#d3adf7' }}
            />
          </Card>
        </Col>
      </Row>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>加载统计图表...</p>
        </div>
      ) : (
        <>
          {/* 第一行：两个图表 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="能带间隙分布">
                <BandGapChart
                  data={bandGapData || []}
                  loading={bandGapLoading}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="元素频率分布 (Top 20)">
                <ElementFrequencyChart
                  data={elementFrequencyData || []}
                  loading={elementFrequencyLoading}
                  topN={20}
                />
              </Card>
            </Col>
          </Row>

          {/* 第二行：两个图表 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="晶体系统分布">
                <CrystalSystemPie
                  data={crystalSystemData || []}
                  loading={crystalSystemLoading}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="稳定性分布">
                <CrystalSystemPie
                  data={stabilityPieData}
                  loading={stabilityLoading}
                />
              </Card>
            </Col>
          </Row>

          {/* 稀土专属统计板块 */}
          <Divider style={{ fontSize: 16, fontWeight: 600, color: '#1a3a5c' }}>
            稀土元素统计
          </Divider>

          {/* 稀土摘要卡片 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="含稀土材料总数"
                  value={reaSummary?.total_with_rare_earth ?? 0}
                  loading={reaSummaryLoading}
                  valueStyle={{ fontSize: 28, color: '#d4a017' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="占全库比例"
                  value={reaSummary?.ratio ? formatFloat(reaSummary.ratio * 100, 1) : '0'}
                  suffix="%"
                  loading={reaSummaryLoading}
                  valueStyle={{ fontSize: 28, color: '#d4a017' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="含轻稀土材料"
                  value={reaSummary?.light_re_count ?? 0}
                  loading={reaSummaryLoading}
                  valueStyle={{ fontSize: 28, color: '#fa8c16' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="含重稀土材料"
                  value={reaSummary?.heavy_re_count ?? 0}
                  loading={reaSummaryLoading}
                  valueStyle={{ fontSize: 28, color: '#13c2c2' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 稀土图表行 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card title="稀土元素出现频率">
                <ReactECharts
                  showLoading={reaFrequencyLoading}
                  option={{
                    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                    xAxis: { type: 'value', name: '材料数量' },
                    yAxis: {
                      type: 'category',
                      data: (reaFrequency ?? []).slice().sort((a, b) => a.count - b.count).map(d => `${d.element} ${d.name_cn}`),
                    },
                    series: [{
                      type: 'bar',
                      data: (reaFrequency ?? []).slice().sort((a, b) => a.count - b.count).map(d => ({
                        value: d.count,
                        itemStyle: { color: d.type === 'light' ? '#fa8c16' : '#13c2c2' },
                      })),
                      label: { show: true, position: 'right', formatter: '{c}' },
                    }],
                    grid: { left: 80, right: 80, bottom: 40, top: 20 },
                  }}
                  style={{ height: 420, width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="轻/重稀土分布">
                <ReactECharts
                  showLoading={reaSummaryLoading}
                  option={{
                    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                    legend: { bottom: 0 },
                    series: [{
                      type: 'pie',
                      radius: ['40%', '70%'],
                      data: [
                        { value: reaSummary?.light_re_count ?? 0, name: '轻稀土', itemStyle: { color: '#fa8c16' } },
                        { value: reaSummary?.heavy_re_count ?? 0, name: '重稀土', itemStyle: { color: '#13c2c2' } },
                      ],
                      label: { formatter: '{b}\n{d}%' },
                    }],
                  }}
                  style={{ height: 420, width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}