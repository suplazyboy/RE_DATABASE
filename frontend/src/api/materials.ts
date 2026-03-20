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