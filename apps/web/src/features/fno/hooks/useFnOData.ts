import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type {
  RolloverData, ParticipantOI, CostOfCarry, OITrend, PCRData, ApiEnvelope,
} from '../types/fno.types';

/** Thin wrapper to unwrap { data, meta } envelopes and tolerate legacy shapes. */
async function get<T>(url: string): Promise<T> {
  const res = await api.get<ApiEnvelope<T>>(url);
  return res.data.data as T;
}

export function useRollover(symbol: string) {
  return useQuery<RolloverData>({
    queryKey: ['fno-v2', 'rollover', symbol],
    queryFn: () => get<RolloverData>(`/api/v1/fno/rollover?symbol=${encodeURIComponent(symbol)}`),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMarketWideRollover() {
  return useQuery<RolloverData[]>({
    queryKey: ['fno-v2', 'rollover', 'market-wide'],
    queryFn: () => get<RolloverData[]>('/api/v1/fno/rollover/market-wide'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useParticipantOI(date?: string) {
  const d = date ?? new Date().toISOString().slice(0, 10);
  return useQuery<ParticipantOI[]>({
    queryKey: ['fno-v2', 'participant-oi', d],
    queryFn: () => get<ParticipantOI[]>(`/api/v1/fno/participant-oi?date=${d}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCostOfCarry(symbol: string) {
  return useQuery<CostOfCarry[]>({
    queryKey: ['fno-v2', 'coc', symbol],
    queryFn: () => get<CostOfCarry[]>(`/api/v1/fno/cost-of-carry?symbol=${encodeURIComponent(symbol)}`),
    enabled: !!symbol,
    staleTime: 60 * 1000,
  });
}

export function useOITrends(symbol: string, expiry?: string) {
  return useQuery<OITrend[]>({
    queryKey: ['fno-v2', 'oi-trends', symbol, expiry ?? 'all'],
    queryFn: () => get<OITrend[]>(
      `/api/v1/fno/oi-trends?symbol=${encodeURIComponent(symbol)}${expiry ? `&expiry=${expiry}` : ''}`,
    ),
    enabled: !!symbol,
    staleTime: 60 * 1000,
  });
}

export function usePCR(symbol: string, expiry?: string) {
  return useQuery<PCRData>({
    queryKey: ['fno-v2', 'pcr', symbol, expiry ?? 'all'],
    queryFn: () => get<PCRData>(
      `/api/v1/fno/pcr?symbol=${encodeURIComponent(symbol)}${expiry ? `&expiry=${expiry}` : ''}`,
    ),
    enabled: !!symbol,
    staleTime: 60 * 1000,
  });
}

export function useMarketWidePCR() {
  return useQuery<PCRData[]>({
    queryKey: ['fno-v2', 'pcr', 'market-wide'],
    queryFn: () => get<PCRData[]>('/api/v1/fno/pcr/market-wide'),
    staleTime: 60 * 1000,
  });
}
