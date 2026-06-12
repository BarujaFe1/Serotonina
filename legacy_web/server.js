const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const WORLD_CUP_BASE = process.env.WORLD_CUP_BASE || 'https://worldcup26.ir';
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 1000 * 60 * 2);

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const cache = new Map();
let lastGoodSnapshot = null;

const FALLBACK_DATA = {
  games: [],
  groups: [],
  stadiums: [],
  teams: [
    { id: '1', name_en: 'Brazil', name: 'Brazil' },
    { id: '2', name_en: 'Argentina', name: 'Argentina' },
    { id: '3', name_en: 'Spain', name: 'Spain' },
    { id: '4', name_en: 'Germany', name: 'Germany' },
    { id: '5', name_en: 'Portugal', name: 'Portugal' },
    { id: '6', name_en: 'England', name: 'England' },
    { id: '7', name_en: 'France', name: 'France' },
    { id: '8', name_en: 'Netherlands', name: 'Netherlands' },
    { id: '9', name_en: 'Belgium', name: 'Belgium' },
    { id: '10', name_en: 'Uruguay', name: 'Uruguay' },
    { id: '11', name_en: 'Croatia', name: 'Croatia' },
    { id: '12', name_en: 'Morocco', name: 'Morocco' }
  ]
};

function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function setCached(key, data) {
  cache.set(key, { createdAt: Date.now(), data });
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Sonho-Vivo-Copa-2026/2.0',
        ...(options.headers || {})
      }
    });

    const contentType = response.headers.get('content-type') || '';
    const raw = await response.text();
    let payload = raw;
    if (contentType.includes('application/json') || raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new Error(`Resposta JSON inválida de ${url}`);
      }
    }

    if (!response.ok) {
      const message = typeof payload === 'string' ? payload.slice(0, 300) : JSON.stringify(payload).slice(0, 300);
      throw new Error(`HTTP ${response.status}: ${message}`);
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWorldCupResource(resource) {
  const cacheKey = `worldcup:${resource}`;
  const cached = getCached(cacheKey);
  if (cached) return { resource, cached: true, source: `${WORLD_CUP_BASE}/get/${resource}`, data: cached };
  const data = await fetchJson(`${WORLD_CUP_BASE}/get/${resource}`);
  setCached(cacheKey, data);
  return { resource, cached: false, source: `${WORLD_CUP_BASE}/get/${resource}`, data };
}

function normalizePayload(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload[key])) return payload[key];
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && payload.data && Array.isArray(payload.data[key])) return payload.data[key];
  return [];
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'O sonho ainda esta vivo?', version: '2.0.0', time: new Date().toISOString() });
});

app.get('/api/worldcup/snapshot', async (req, res) => {
  const resources = ['games', 'groups', 'teams', 'stadiums'];
  const settled = await Promise.allSettled(resources.map(fetchWorldCupResource));
  const errors = [];
  const result = { games: [], groups: [], teams: [], stadiums: [] };
  const sources = [];

  settled.forEach((entry, index) => {
    const resource = resources[index];
    if (entry.status === 'fulfilled') {
      result[resource] = normalizePayload(entry.value.data, resource);
      sources.push(entry.value.source);
    } else {
      errors.push(`${resource}: ${entry.reason?.message || 'falha desconhecida'}`);
    }
  });

  const hasUsefulLiveData = result.games.length > 0 || result.groups.length > 0 || result.teams.length > 12;
  if (hasUsefulLiveData) {
    const snapshot = {
      ok: true,
      live: true,
      fallback: false,
      generatedAt: new Date().toISOString(),
      sources,
      errors,
      ...result
    };
    lastGoodSnapshot = snapshot;
    return res.json(snapshot);
  }

  if (lastGoodSnapshot) {
    return res.json({
      ...lastGoodSnapshot,
      ok: true,
      live: false,
      fallback: true,
      stale: true,
      generatedAt: new Date().toISOString(),
      errors: errors.length ? errors : ['Usando último snapshot válido em cache.']
    });
  }

  res.json({
    ok: true,
    live: false,
    fallback: true,
    generatedAt: new Date().toISOString(),
    sources: ['fallback-local'],
    errors: errors.length ? errors : ['Sem dados externos no momento.'],
    ...FALLBACK_DATA
  });
});

app.get('/api/worldcup/:resource', async (req, res) => {
  const allowed = new Set(['games', 'groups', 'teams', 'stadiums']);
  const resource = String(req.params.resource || '').toLowerCase();
  if (!allowed.has(resource)) {
    return res.status(400).json({ ok: false, error: 'Recurso inválido. Use games, groups, teams ou stadiums.' });
  }
  try {
    const item = await fetchWorldCupResource(resource);
    res.json({ ok: true, cached: item.cached, source: item.source, data: item.data });
  } catch (error) {
    res.status(502).json({ ok: false, source: `${WORLD_CUP_BASE}/get/${resource}`, error: error.message || 'Falha ao consultar API da Copa 2026.' });
  }
});

app.get('/api/odds/the-odds-api', async (req, res) => {
  const apiKey = req.query.apiKey || process.env.THE_ODDS_API_KEY;
  const sport = req.query.sport || 'soccer_fifa_world_cup';
  const regions = req.query.regions || 'eu,us,uk';
  const markets = req.query.markets || 'outrights';
  const oddsFormat = req.query.oddsFormat || 'decimal';

  if (!apiKey) {
    return res.status(400).json({ ok: false, error: 'Informe uma chave da The Odds API no painel ou configure THE_ODDS_API_KEY no ambiente.' });
  }

  const url = new URL(`https://api.the-odds-api.com/v4/sports/${encodeURIComponent(sport)}/odds/`);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('regions', regions);
  url.searchParams.set('markets', markets);
  url.searchParams.set('oddsFormat', oddsFormat);

  try {
    const data = await fetchJson(url.toString());
    res.json({ ok: true, source: 'The Odds API', data });
  } catch (error) {
    res.status(502).json({ ok: false, source: 'The Odds API', error: error.message || 'Falha ao consultar odds.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('==========================================================');
  console.log('  O SONHO AINDA ESTA VIVO? — Aposta Copa 2026');
  console.log(`  Rodando em http://localhost:${PORT}`);
  console.log('==========================================================');
});
