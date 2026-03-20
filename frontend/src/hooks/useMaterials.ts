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