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
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1a3a5c',
            colorSuccess: '#52c41a',
            colorWarning: '#d4a017',
            colorInfo: '#4a90d9',
            borderRadius: 8,
            colorBgContainer: '#ffffff',
            colorBgLayout: '#f0f2f5',
            fontFamily: "'Inter', 'Noto Sans SC', -apple-system, sans-serif",
          },
          components: {
            Layout: {
              headerBg: '#0d1b2a',
              headerColor: '#e0e0e0',
            },
            Table: {
              headerBg: '#f5f7fa',
              headerColor: '#1a3a5c',
            },
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