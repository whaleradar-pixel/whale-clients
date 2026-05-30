// Signs impersonation payload with HMAC-SHA256.
// Key is derived from project anon key suffix to prevent cross-project token reuse.

// Derive signing key from the anon key (build-time env var) so it's project-specific
// and not a trivially guessable static string.
const SIGN_KEY = `WR_IMP_2026_${import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(-16) ?? 'fallback'}`;

async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(SIGN_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export interface ImpersonationData {
  userId: string;
  email: string;
  fullName: string;
  plan: string;
  accessCode: string | null;
  timestamp: number;
}

export async function writeImpersonation(data: ImpersonationData): Promise<void> {
  const payload = JSON.stringify(data);
  const sig = await hmac(payload);
  localStorage.setItem('wr_impersonation', JSON.stringify({ payload, sig }));
}

export async function readImpersonation(): Promise<ImpersonationData | null> {
  const raw = localStorage.getItem('wr_impersonation');
  if (!raw) return null;
  try {
    const { payload, sig } = JSON.parse(raw) as { payload: string; sig: string };
    const expected = await hmac(payload);
    if (sig !== expected) {
      // Signature mismatch — tampered, reject
      localStorage.removeItem('wr_impersonation');
      return null;
    }
    const data = JSON.parse(payload) as ImpersonationData;
    if (Date.now() - data.timestamp > 30 * 60 * 1000) {
      localStorage.removeItem('wr_impersonation');
      return null;
    }
    return data;
  } catch {
    localStorage.removeItem('wr_impersonation');
    return null;
  }
}

export function clearImpersonation(): void {
  localStorage.removeItem('wr_impersonation');
}
