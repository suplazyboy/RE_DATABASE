import { Card, Row, Col, Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function Home() {
  return (
    <div>
      <Title level={2}>晶体材料数据库</Title>
      <Paragraph>
        本数据库收录了数千种晶体材料的结构、电子、力学、热力学性质数据，支持高级筛选、可视化分析和数据导出。
      </Paragraph>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card title="材料库" bordered={false}>
            浏览完整的材料列表，查看每种材料的基本性质、晶体结构、电子能带等详细信息。
          </Card>
        </Col>
        <Col span={8}>
          <Card title="高级搜索" bordered={false}>
            通过元素组成、能带间隙、磁性、稳定性等多维度条件精确筛选材料。
          </Card>
        </Col>
        <Col span={8}>
          <Card title="数据统计" bordered={false}>
            查看材料数据的分布统计，包括元素频率、晶体系统分布、能带间隙直方图等。
          </Card>
        </Col>
      </Row>
    </div>
  );
}