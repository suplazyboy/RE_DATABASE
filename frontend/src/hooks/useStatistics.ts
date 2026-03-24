import { useQuery } from '@tanstack/react-query';
import { statisticsApi } from '../api/statistics';

// 统计摘要
export function useSummary() {
  return useQuery({
    queryKey: ['statistics', 'summary'],
    queryFn: statisticsApi.summary,
    staleTime: 10 * 60 * 1000, // 10分钟
  });
}

// 元素频率统计
export function useElementFrequency() {
  return useQuery({
    queryKey: ['statistics', 'elementFrequency'],
    queryFn: statisticsApi.elementFrequency,
    staleTime: 10 * 60 * 1000, // 10分钟
  });
}

// 晶体系统分布
export function useCrystalSystemDistribution() {
  return useQuery({
    queryKey: ['statistics', 'crystalSystemDistribution'],
    queryFn: statisticsApi.crystalSystemDistribution,
    staleTime: 10 * 60 * 1000,
  });
}

// 能带间隙分布
export function useBandGapDistribution() {
  return useQuery({
    queryKey: ['statistics', 'bandGapDistribution'],
    queryFn: statisticsApi.bandGapDistribution,
    staleTime: 10 * 60 * 1000,
  });
}

// 稳定性分布
export function useStabilityDistribution() {
  return useQuery({
    queryKey: ['statistics', 'stabilityDistribution'],
    queryFn: statisticsApi.stabilityDistribution,
    staleTime: 10 * 60 * 1000,
  });
}

// 稀土统计摘要
export function useRareEarthSummary() {
  return useQuery({
    queryKey: ['statistics', 'rareEarthSummary'],
    queryFn: statisticsApi.rareEarthSummary,
    staleTime: 10 * 60 * 1000,
  });
}

// 稀土元素频率
export function useRareEarthFrequency() {
  return useQuery({
    queryKey: ['statistics', 'rareEarthFrequency'],
    queryFn: statisticsApi.rareEarthFrequency,
    staleTime: 10 * 60 * 1000,
  });
}