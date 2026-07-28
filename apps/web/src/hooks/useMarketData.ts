import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { IndexQuote, MarketStatusInfo } from '../types/market';

export interface MarketIndicesData {
  quotes: IndexQuote[];
  status: MarketStatusInfo;
}

export function useMarketIndices() {
  return useQuery<MarketIndicesData>({
    queryKey: ['market', 'indices'],
    queryFn: async () => {
      const res = await api.get<{ data: MarketIndicesData }>('/market/indices');
      return res.data.data;
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}
