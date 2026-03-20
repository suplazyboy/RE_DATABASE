# 04 — 前端：项目初始化与基础架构

## 目标
搭建 React + TypeScript + Vite 前端项目，配置 Ant Design、TanStack Query、React Router，建立 API 调用层和类型定义。

---

## 1. 项目创建

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install

# UI 框架
npm install antd @ant-design/icons @ant-design/pro-components

# 数据请求
npm install @tanstack/react-query axios

# 路由
npm install react-router-dom

# 图表（二选一或都装）
npm install echarts echarts-for-react
# 或
npm install recharts

# 工具
npm install dayjs lodash-es
npm install -D @types/lodash-es
```

## 2. 项目结构

```
src/
├── main.tsx                    # 入口
├── App.tsx                     # 根组件（路由 + Provider）
├── vite-env.d.ts
│
├── api/                        # API 调用层
│   ├── client.ts               # axios 实例
│   ├── materials.ts            # 材料相关 API
│   └── statistics.ts           # 统计相关 API
│
├── hooks/                      # 自定义 hooks
│   ├── useMaterials.ts         # TanStack Query hooks
│   ├── useSearch.ts
│   └── useStatistics.ts
│
├── pages/                      # 页面组件
│   ├── MaterialList/
│   │   └── index.tsx
│   ├── MaterialDetail/
│   │   └── index.tsx
│   ├── Search/
│   │   └── index.tsx
│   ├── Statistics/
│   │   └── index.tsx
│   └── Home/
│       └── index.tsx
│
├── components/                 # 可复用组件
│   ├── Layout/
│   │   ├── AppLayout.tsx       # 全局布局
│   │   └── Navbar.tsx
│   ├── PeriodicTable/
│   │   └── PeriodicTable.tsx
│   ├── MaterialTable/
│   │   └── MaterialTable.tsx
│   ├── FilterPanel/
│   │   └── FilterPanel.tsx
│   ├── PropertyCard/
│   │   └── PropertyCard.tsx
│   └── Charts/
│       ├── BandGapChart.tsx
│       ├── ElementFrequency.tsx
│       └── CrystalSystemPie.tsx
│
├── types/                      # TypeScript 类型定义
│   ├── material.ts
│   ├── search.ts
│   └── api.ts
│
├── utils/                      # 工具函数
│   ├── format.ts               # 数值格式化
│   └── constants.ts            # 常量（元素数据等）
│
└── styles/                     # 全局样式
    └── global.css
```

## 3. 类型定义 (`src/types/material.ts`)

**必须**与后端 Pydantic Schema 保持一致：

```typescript
// 材料摘要（列表页）
export interface MaterialSummary {
  material_id: string;
  formula_pretty: string | null;
  elements: string[] | null;
  nelements: number | null;
  chemsys: string | null;
  crystal_system: string | null;
  space_group_symbol: string | null;
  nsites: number | null;
  volume: number | null;
  density: number | null;
  band_gap: number | null;
  is_metal: boolean | null;
  is_stable: boolean | null;
  is_magnetic: boolean | null;
  energy_above_hull: number | null;
  formation_energy_per_atom: number | null;
}

// 材料详情（详情页）
export interface MaterialDetail extends MaterialSummary {
  structure: Record<string, unknown> | null;
  lattice: Record<string, unknown> | null;
  symmetry: Record<string, unknown> | null;
  space_group_number: number | null;
  point_group: string | null;
  
  energy_per_atom: number | null;
  decomposes_to: Record<string, unknown>[] | null;
  
  cbm: number | null;
  vbm: number | null;
  efermi: number | null;
  is_gap_direct: boolean | null;
  dos: Record<string, unknown> | null;
  bandstructure: Record<string, unknown> | null;
  
  ordering: string | null;
  total_magnetization: number | null;
  types_of_magnetic_species: string[] | null;
  
  bulk_modulus: Record<string, unknown> | null;
  shear_modulus: Record<string, unknown> | null;
  universal_anisotropy: number | null;
  homogeneous_poisson: number | null;
  
  e_total: number | null;
  e_ionic: number | null;
  e_electronic: number | null;
  n: number | null;
  
  weighted_surface_energy: number | null;
  weighted_work_function: number | null;
  
  database_IDs: Record<string, unknown> | null;
  last_updated: string | null;
  deprecated: boolean | null;
  warnings: string[] | null;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

// 搜索参数
export interface SearchParams {
  page?: number;
  per_page?: number;
  sort_field?: string;
  sort_order?: 'asc' | 'desc';
  
  formula?: string;
  elements?: string;
  exclude_elements?: string;
  chemsys?: string;
  nelements_min?: number;
  nelements_max?: number;
  
  band_gap_min?: number;
  band_gap_max?: number;
  is_metal?: boolean;
  is_gap_direct?: boolean;
  
  is_stable?: boolean;
  energy_above_hull_max?: number;
  
  is_magnetic?: boolean;
  ordering?: string;
  
  crystal_system?: string;
  space_group_number?: number;
  nsites_min?: number;
  nsites_max?: number;
  volume_min?: number;
  volume_max?: number;
  density_min?: number;
  density_max?: number;
}
```

## 4. API 客户端 (`src/api/client.ts`)

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器：统一错误处理
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // 服务端返回错误
      const { status, data } = error.response;
      console.error(`API Error [${status}]:`, data?.detail || data);
    } else if (error.request) {
      console.error('Network error: no response received');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

## 5. API 服务函数 (`src/api/materials.ts`)

```typescript
import apiClient from './client';
import type { MaterialSummary, MaterialDetail, PaginatedResponse, SearchParams } from '../types/material';

// 清除 undefined 参数
function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  );
}

export const materialsApi = {
  // 列表
  list: async (params: SearchParams = {}): Promise<PaginatedResponse<MaterialSummary>> => {
    const { data } = await apiClient.get('/materials', { params: cleanParams(params as Record<string, unknown>) });
    return data;
  },

  // 详情
  getById: async (id: string): Promise<MaterialDetail> => {
    const { data } = await apiClient.get(`/materials/${id}`);
    return data;
  },

  // 搜索
  search: async (params: SearchParams): Promise<PaginatedResponse<MaterialSummary>> => {
    const { data } = await apiClient.get('/search/materials', { params: cleanParams(params as Record<string, unknown>) });
    return data;
  },

  // 自动补全
  autocomplete: async (q: string): Promise<string[]> => {
    const { data } = await apiClient.get('/search/autocomplete', { params: { q } });
    return data;
  },
};
```

## 6. TanStack Query Hooks (`src/hooks/useMaterials.ts`)

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { materialsApi } from '../api/materials';
import type { SearchParams } from '../types/material';

// 材料列表（支持分页 + 过滤）
export function useMaterials(params: SearchParams) {
  return useQuery({
    queryKey: ['materials', params],
    queryFn: () => materialsApi.search(params),
    placeholderData: keepPreviousData, // 翻页时保留上一页数据，避免闪烁
    staleTime: 5 * 60 * 1000, // 5 分钟内认为数据新鲜
  });
}

// 材料详情
export function useMaterialDetail(id: string) {
  return useQuery({
    queryKey: ['material', id],
    queryFn: () => materialsApi.getById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 详情数据缓存更久
  });
}

// 自动补全（带防抖效果，通过 enabled 控制）
export function useAutocomplete(query: string) {
  return useQuery({
    queryKey: ['autocomplete', query],
    queryFn: () => materialsApi.autocomplete(query),
    enabled: query.length >= 1,
    staleTime: 60 * 1000,
  });
}
```

## 7. App 入口 (`src/App.tsx`)

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import AppLayout from './components/Layout/AppLayout';
import Home from './pages/Home';
import MaterialList from './pages/MaterialList';
import MaterialDetail from './pages/MaterialDetail';
import Search from './pages/Search';
import Statistics from './pages/Statistics';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
          },
        }}
      >
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/materials" element={<MaterialList />} />
              <Route path="/materials/:id" element={<MaterialDetail />} />
              <Route path="/search" element={<Search />} />
              <Route path="/statistics" element={<Statistics />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
```

## 8. 全局布局 (`src/components/Layout/AppLayout.tsx`)

使用 Ant Design 的 Layout 组件：

```typescript
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
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginRight: 40 }}>
          Crystal Materials DB
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
      <Content style={{ padding: '24px 48px' }}>
        <Outlet />
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        Crystal Materials Database ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}
```

## 9. 环境变量 (`.env`)

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## 10. Vite 配置 (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## 验收标准

- [ ] `npm run dev` 正常启动，无编译错误
- [ ] 路由导航正常（首页、材料库、搜索、统计四个页面切换）
- [ ] API 请求能到达后端（检查 Network 面板）
- [ ] TypeScript 类型无报错
- [ ] Ant Design 组件正常渲染

## 常见错误提醒

1. Vite 环境变量必须以 `VITE_` 开头
2. `import.meta.env.VITE_API_BASE_URL` 类型是 `string | undefined`
3. TanStack Query 的 `queryKey` 必须是可序列化的，不要放函数
4. antd v5 不需要单独引入 CSS，它用 CSS-in-JS
5. React Router v6 用 `<Outlet />` 替代 v5 的嵌套 `<Route>` children
