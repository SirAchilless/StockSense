import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { GlobalMarketsData } from '../types/global-markets';

export function useGlobalMarkets() {
  return useQuery<GlobalMarketsData>({
    queryKey: ['global-markets'],
    queryFn: async () => {
      const res = await api.get<{ data: GlobalMarketsData }>('/market/global');
      return res.data.data;
    },
    staleTime: 3 * 60 * 1000,   // 3 min — global data moves slower than intraday
    refetchInterval: 3 * 60 * 1000,
    retry: 1,
  });
}
