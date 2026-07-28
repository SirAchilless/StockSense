export class DataUnavailableError extends Error {
  readonly code = 'DATA_UNAVAILABLE';
  readonly retryable: boolean;
  readonly source: string;

  constructor(message: string, opts: { retryable?: boolean; source?: string } = {}) {
    super(message);
    this.name = 'DataUnavailableError';
    this.retryable = opts.retryable ?? true;
    this.source = opts.source ?? 'unknown';
  }

  toErrorEnvelope() {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
      },
    };
  }
}

export function isDataUnavailableError(err: unknown): err is DataUnavailableError {
  return err instanceof DataUnavailableError;
}
