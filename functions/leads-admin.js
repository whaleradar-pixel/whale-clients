function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, PATCH, OPTIONS',
      'access-control-allow-headers': 'content-type'
    },
    body: JSON.stringify(body)
  };
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

async function supabaseFetch(path, options = {}) {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error('Supabase is not configured');
  const headers = {
    apikey: cfg.key,
    'content-type': 'application/json',
    ...(options.headers || {})
  };
  if (!cfg.key.startsWith('sb_secret_')) {
    headers.authorization = `Bearer ${cfg.key}`;
  }
  const response = await fetch(`${cfg.url}/rest/v1/${path}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Supabase HTTP ${response.status}`);
  }
  return response;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});

  if (!supabaseConfig()) {
    return json(503, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  try {
    if (event.httpMethod === 'GET') {
      const response = await supabaseFetch('leads?select=*&order=created_at.desc&limit=200');
      const leads = await response.json();
      return json(200, { ok: true, leads });
    }

    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const id = String(body.id || '').trim();
      const status = String(body.status || '').trim();
      if (!id || !['new', 'contacted', 'converted', 'closed'].includes(status)) {
        return json(400, { error: 'Invalid id or status' });
      }
      await supabaseFetch(`leads?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ status })
      });
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (error) {
    return json(502, { error: error.message || 'Supabase request failed' });
  }
};
