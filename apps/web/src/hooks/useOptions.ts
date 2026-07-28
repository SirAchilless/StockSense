import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { OptionChain, OptionAnalysisResult } from '../types/options';

export function useOptionChain(symbol: string, expiry?: string) {
  return useQuery<OptionChain>({
    queryKey: ['options', 'chain', symbol, expiry ?? 'default'],
    queryFn: async () => {
      const params = expiry ? { expiry } : {};
      const res = await api.get<{ data: OptionChain }>(`/options/chain/${symbol}`, { params });
      return res.data.data;
    },
    enabled: !!symbol,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

export function useOptionAnalysis(symbol: string, expiry?: string, enabled = false) {
  return useQuery<OptionAnalysisResult>({
    queryKey: ['options', 'analysis', symbol, expiry ?? 'default'],
    queryFn: async () => {
      const params = expiry ? { expiry } : {};
      const res = await api.get<{ data: OptionAnalysisResult }>(`/options/analysis/${symbol}`, { params });
      return res.data.data;
    },
    enabled: enabled && !!symbol,
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });
}

export function useOptionExpiries(symbol: string) {
  return useQuery<string[]>({
    queryKey: ['options', 'expiries', symbol],
    queryFn: async () => {
      const res = await api.get<{ data: { expiries: string[] } }>(`/options/expiries/${symbol}`);
      return res.data.data.expiries;
    },
    enabled: !!symbol,
    staleTime: 10 * 60 * 1000,
  });
}
