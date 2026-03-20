import apiClient from './client';

export interface SummaryStats {
  total_materials: number;
  stable_count: number;
  stable_ratio: number;
  metal_count: number;
  metal_ratio: number;
  magnetic_count: number;
  magnetic_ratio: number;
}

export interface ElementFrequencyItem {
  element: string;
  frequency: number;
}

export interface CrystalSystemDistributionItem {
  crystal_system: string;
  count: number;
}

export interface BandGapDistributionItem {
  bucket: number;
  count: number;
  range_min: number;
  range_max: number;
  range_label: string;
}

export interface StabilityDistribution {
  stable: number;
  unstable: number;
  unknown: number;
  total: number;
}

export const statisticsApi = {
  // 获取统计摘要
  summary: async (): Promise<SummaryStats> => {
    const { data } = await apiClient.get('/statistics/summary');
    return data;
  },

  // 获取元素频率统计
  elementFrequency: async (): Promise<ElementFrequencyItem[]> => {
    const { data } = await apiClient.get('/statistics/elements_frequency');
    return data;
  },

  // 获取晶体系统分布
  crystalSystemDistribution: async (): Promise<CrystalSystemDistributionItem[]> => {
    const { data } = await apiClient.get('/statistics/crystal_systems');
    return data;
  },

  // 获取能带间隙分布
  bandGapDistribution: async (): Promise<BandGapDistributionItem[]> => {
    const { data } = await apiClient.get('/statistics/band_gap_distribution');
    return data;
  },

  // 获取稳定性分布
  stabilityDistribution: async (): Promise<StabilityDistribution> => {
    const { data } = await apiClient.get('/statistics/stability_distribution');
    return data;
  },
};