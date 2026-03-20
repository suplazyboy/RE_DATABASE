import { useMaterials } from './useMaterials';
import type { SearchParams } from '../types/material';

// 搜索材料（重用 useMaterials）
export function useSearch(params: SearchParams) {
  return useMaterials(params);
}