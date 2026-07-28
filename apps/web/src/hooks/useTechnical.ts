import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { TechnicalData, Timeframe } from '../types/technical';

export function useTechnical(symbol: string | null, timeframe: Timeframe) {
  return useQuery<TechnicalData>({
    queryKey: ['technical', symbol, timeframe],
    queryFn: async () => {
      const res = await api.get<{ data: TechnicalData }>(`/technical/${symbol}`, {
        params: { timeframe },
      });
      return res.data.data;
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
