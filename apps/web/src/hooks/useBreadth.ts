import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { MarketBreadthData } from '../types/breadth';

export function useBreadth() {
  return useQuery<MarketBreadthData>({
    queryKey: ['market-breadth'],
    queryFn: async () => {
      const res = await api.get<{ data: MarketBreadthData }>('/market/breadth');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}
