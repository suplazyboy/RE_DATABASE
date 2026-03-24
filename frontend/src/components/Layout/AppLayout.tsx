import { Layout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  DatabaseOutlined,
  SearchOutlined,
  BarChartOutlined,
} from '@ant-design/icons';

const { Header, Content, Footer } = Layout;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/materials', icon: <DatabaseOutlined />, label: '材料库' },
  { key: '/search', icon: <SearchOutlined />, label: '高级搜索' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '数据统计' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ color: '#e0e0e0', fontSize: 18, fontWeight: 600, marginRight: 40, whiteSpace: 'nowrap' }}>
          稀土材料晶体数据库
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1 }}
        />
      </Header>
      <Content style={{ padding: '24px', minWidth: 0 }}>
        <Outlet />
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        稀土材料晶体数据库 Rare Earth Crystal Materials Database ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}