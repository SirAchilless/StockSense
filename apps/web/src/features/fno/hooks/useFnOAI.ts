import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { FnoAnalysisResult } from '../types/fno.types';

export function useFnOAI(symbol: string, enabled = false) {
  return useQuery<FnoAnalysisResult>({
    queryKey: ['fno', 'analysis', symbol],
    queryFn: async () => {
      const res = await api.get<{ data: FnoAnalysisResult }>(`/fno/analysis/${symbol}`);
      return res.data.data;
    },
    enabled: enabled && !!symbol,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
