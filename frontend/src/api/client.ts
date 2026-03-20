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