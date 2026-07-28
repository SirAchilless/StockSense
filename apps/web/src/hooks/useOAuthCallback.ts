import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCredentials } from '../store/authSlice';
import type { AuthUser } from '../store/authSlice';

/**
 * Handles the ?token=<jwt> query param that the backend injects after
 * a successful Google OAuth redirect. Decodes the payload (no signature
 * verification needed — the server already verified it), stores it in
 * Redux + localStorage, then strips the param from the URL.
 */
export function useOAuthCallback() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;

    try {
      // JWT is three base64url segments; middle segment is the payload
      const [, payloadB64] = token.split('.');
      const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(json) as {
        sub: string;
        email: string;
        name?: string;
        avatar?: string;
        iat?: number;
        exp?: number;
      };

      const user: AuthUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name ?? null,
        avatar: payload.avatar ?? null,
        createdAt: new Date().toISOString(),
      };

      dispatch(setCredentials({ token, user }));
    } catch {
      // Malformed token — ignore and let normal auth flow handle it
    }

    // Remove ?token= from the URL without a history entry
    params.delete('token');
    const newSearch = params.toString();
    navigate(newSearch ? `/?${newSearch}` : '/', { replace: true });
  }, [dispatch, navigate]);
}
