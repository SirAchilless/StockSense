import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { NewsResponse, SymbolNewsResponse } from '../types/news';

export function useMarketNews(withSentiment = false) {
  return useQuery<NewsResponse>({
    queryKey: ['news', 'market', withSentiment],
    queryFn: async () => {
      const res = await api.get<{ data: NewsResponse }>('/news', {
        params: { limit: 12, sentiment: withSentiment },
      });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useSymbolNews(symbol: string | null, withSentiment = false) {
  return useQuery<SymbolNewsResponse>({
    queryKey: ['news', 'symbol', symbol, withSentiment],
    queryFn: async () => {
      const res = await api.get<{ data: SymbolNewsResponse }>(`/news/${symbol}`, {
        params: { limit: 8, sentiment: withSentiment },
      });
      return res.data.data;
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
