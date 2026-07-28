// Typed errors used across services → routes.
// The global error middleware translates these into the standard error envelope.

export type ErrorCode =
  | 'DATA_UNAVAILABLE'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SYMBOL_NOT_SUPPORTED'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    opts: { status?: number; retryable?: boolean; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = opts.status ?? 500;
    this.retryable = opts.retryable ?? false;
    this.details = opts.details;
  }
}

/**
 * Raised when an upstream data source (NSE, vendor, cache-miss on required field)
 * does not return the data required to fulfil the request.
 *
 * Per constraint 2.3: callers must NOT fabricate or estimate values. This error
 * propagates up to the route handler which returns the structured error
 * envelope, and the UI renders "Data unavailable: <reason>".
 */
export class DataUnavailableError extends AppError {
  constructor(reason: string, opts: { retryable?: boolean; details?: Record<string, unknown> } = {}) {
    super('DATA_UNAVAILABLE', reason, {
      status: 502,
      retryable: opts.retryable ?? true,
      details: opts.details,
    });
    this.name = 'DataUnavailableError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, { status: 400, retryable: false, details });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message, { status: 404, retryable: false });
    this.name = 'NotFoundError';
  }
}
