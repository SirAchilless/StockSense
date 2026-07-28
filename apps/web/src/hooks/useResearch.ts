import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ResearchResult } from '../types/research';

export function useResearch(symbol: string | null) {
  return useQuery<ResearchResult>({
    queryKey: ['research', symbol],
    queryFn: async () => {
      const res = await api.get<{ data: ResearchResult }>(`/research/${symbol}`);
      return res.data.data;
    },
    enabled: !!symbol,
    staleTime: 15 * 60 * 1000, // match server cache TTL
    retry: 1,
  });
}
