import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PortfolioSummary, Holding } from '../types/portfolio';

export function usePortfolio() {
  return useQuery<PortfolioSummary>({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const res = await api.get<{ data: PortfolioSummary }>('/portfolio');
      return res.data.data;
    },
    refetchInterval: 60_000,
  });
}

export function useAddHolding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { symbol: string; quantity: number; buyPrice: number; buyDate: string; notes?: string }) =>
      api.post<{ data: Holding }>('/portfolio/holdings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useDeleteHolding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/portfolio/holdings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}
