// Unit test: JWT authenticate middleware returns 401 on missing/invalid token
// (C.5: unauthenticated → 401, not 403, not 500).
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { authenticate } from '../../middleware/authenticate';

interface MockRes extends Response {
  _status?: number;
  _body?: unknown;
}

function makeRes(): MockRes {
  const res = {
    _status: 200,
    _body: null as unknown,
    status(code: number) { (res as MockRes)._status = code; return res; },
    json(b: unknown) { (res as MockRes)._body = b; return res; },
  } as unknown as MockRes;
  return res;
}

type Next = ReturnType<typeof vi.fn>;
function makeNext(): Next { return vi.fn(); }

describe('authenticate middleware', () => {
  it('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} } as Request;
    const res = makeRes();
    const next = makeNext();
    authenticate(req, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect((res._body as { error?: string })?.error).toBeDefined();
  });

  it('returns 401 when Bearer token is malformed', () => {
    const req = { headers: { authorization: 'NotBearer foo' } } as unknown as Request;
    const res = makeRes();
    const next = makeNext();
    authenticate(req, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 on invalid JWT', () => {
    const req = { headers: { authorization: 'Bearer invalid.token.value' } } as unknown as Request;
    const res = makeRes();
    const next = makeNext();
    authenticate(req, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
