import { useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { FnOAICommentary, ApiEnvelope, FnOMetric } from '../types/fno.types';

interface Args {
  symbol: string;
  metrics: FnOMetric[];
}

/**
 * Requests AI commentary for the given F&O metrics. Streaming would be ideal
 * but the NVIDIA NIM adapter is accessed server-side; we surface the complete
 * response here and render it in one pass — the response is typically < 500
 * tokens so latency is acceptable.
 */
export function useFnOAICommentary() {
  return useMutation<FnOAICommentary, Error, Args>({
    mutationFn: async ({ symbol, metrics }) => {
      const res = await api.post<ApiEnvelope<FnOAICommentary>>('/api/v1/fno/ai-commentary', {
        symbol, metrics,
      });
      if (res.data.error) {
        throw new Error(res.data.error.message);
      }
      return res.data.data;
    },
  });
}
