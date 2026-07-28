// Shared types across web and api — expanded as features are built

export type ApiResponse<T> =
  | {
      data: T;
      error?: never;
    }
  | {
      data?: never;
      error: string;
    };

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

// Market data types (skeleton — fleshed out in step 1.4)
export type IndexSymbol = 'NIFTY50' | 'BANKNIFTY' | 'SENSEX' | 'INDIAVIX';

export type MarketStatus = 'open' | 'closed' | 'pre-open' | 'post-close';
