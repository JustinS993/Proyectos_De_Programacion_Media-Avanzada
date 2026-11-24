import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';

const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com/recipes';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 20;
const MAX_OFFSET = 1000;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const DETAIL_CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;

const dietValues = new Set([
  '',
  'gluten_free',
  'ketogenic',
  'vegetarian',
  'lacto_vegetarian',
  'ovo_vegetarian',
  'vegan',
  'pescetarian',
  'paleo',
  'primal',
  'low_fodmap',
  'whole30',
  'dairy_free',
]);

export function createApp({
  apiKey = process.env.SPOONACULAR_API_KEY,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8081,http://localhost:19006')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} = {}) {
  const app = express();
  const cache = new Map();
  const allowedOriginSet = new Set(allowedOrigins);

  app.disable('x-powered-by');
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOriginSet.has(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed'));
    },
  }));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/recipes', async (request, response) => {
    const query = typeof request.query.query === 'string' ? request.query.query.trim() : '';
    const diet = typeof request.query.diet === 'string' ? request.query.diet : '';
    const offset = parseInteger(request.query.offset, 0);
    const number = parseInteger(request.query.number, DEFAULT_PAGE_SIZE);

    if (query.length > 100) {
      return response.status(400).json({ code: 'INVALID_QUERY', error: 'Search query is too long.' });
    }
    if (!dietValues.has(diet)) {
      return response.status(400).json({ code: 'INVALID_DIET', error: 'Unsupported diet filter.' });
    }
    if (offset === null || offset > MAX_OFFSET) {
      return response.status(400).json({ code: 'INVALID_OFFSET', error: 'Offset must be between 0 and 1000.' });
    }
    if (number === null || number < 1 || number > MAX_PAGE_SIZE) {
      return response.status(400).json({ code: 'INVALID_PAGE_SIZE', error: 'Page size must be between 1 and 20.' });
    }
    if (!apiKey) {
      return response.status(503).json({ code: 'API_NOT_CONFIGURED', error: 'Recipe service is not configured.' });
    }

    const cacheKey = `search:${JSON.stringify([query.toLowerCase(), diet, offset, number])}`;
    const cached = getCached(cache, cacheKey, now());
    if (cached) return response.json(cached);

    const upstreamUrl = new URL(`${SPOONACULAR_BASE_URL}/complexSearch`);
    upstreamUrl.search = new URLSearchParams({
      apiKey,
      number: String(number),
      offset: String(offset),
      addRecipeInformation: 'true',
      fillIngredients: 'true',
      ...(query ? { query } : {}),
      ...(diet ? { diet } : {}),
    }).toString();

    try {
      const upstream = await fetchImpl(upstreamUrl, {
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: 'application/json' },
      });
      if (upstream.status === 402 || upstream.status === 429) {
        return response.status(429).json({
          code: 'RATE_LIMITED',
          error: 'The recipe provider rate limit or quota has been reached.',
        });
      }
      if (!upstream.ok) {
        return response.status(502).json({
          code: 'UPSTREAM_ERROR',
          error: 'The recipe provider could not complete the request.',
        });
      }

      const data = await upstream.json();
      if (!data || !Array.isArray(data.results) || !Number.isInteger(data.totalResults)) {
        return response.status(502).json({
          code: 'INVALID_UPSTREAM_RESPONSE',
          error: 'The recipe provider returned an invalid response.',
        });
      }

      const page = {
        results: data.results,
        totalResults: data.totalResults,
        offset,
        number,
      };
      setCached(cache, cacheKey, page, now() + SEARCH_CACHE_TTL_MS);
      return response.json(page);
    } catch (error) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        return response.status(504).json({ code: 'UPSTREAM_TIMEOUT', error: 'The recipe provider timed out.' });
      }
      return response.status(502).json({ code: 'UPSTREAM_UNAVAILABLE', error: 'The recipe provider is unavailable.' });
    }
  });

  app.get('/api/recipes/:id', async (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return response.status(400).json({ code: 'INVALID_RECIPE_ID', error: 'Recipe id must be a positive integer.' });
    }
    if (!apiKey) {
      return response.status(503).json({ code: 'API_NOT_CONFIGURED', error: 'Recipe service is not configured.' });
    }

    const cacheKey = `detail:${id}`;
    const cached = getCached(cache, cacheKey, now());
    if (cached) return response.json(cached);

    const upstreamUrl = new URL(`${SPOONACULAR_BASE_URL}/${id}/information`);
    upstreamUrl.searchParams.set('apiKey', apiKey);
    try {
      const upstream = await fetchImpl(upstreamUrl, {
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: 'application/json' },
      });
      if (upstream.status === 402 || upstream.status === 429) {
        return response.status(429).json({
          code: 'RATE_LIMITED',
          error: 'The recipe provider rate limit or quota has been reached.',
        });
      }
      if (upstream.status === 404) {
        return response.status(404).json({ code: 'RECIPE_NOT_FOUND', error: 'Recipe not found.' });
      }
      if (!upstream.ok) {
        return response.status(502).json({
          code: 'UPSTREAM_ERROR',
          error: 'The recipe provider could not complete the request.',
        });
      }

      const recipe = await upstream.json();
      if (!recipe || recipe.id !== id || typeof recipe.title !== 'string') {
        return response.status(502).json({
          code: 'INVALID_UPSTREAM_RESPONSE',
          error: 'The recipe provider returned an invalid response.',
        });
      }
      setCached(cache, cacheKey, recipe, now() + DETAIL_CACHE_TTL_MS);
      return response.json(recipe);
    } catch (error) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        return response.status(504).json({ code: 'UPSTREAM_TIMEOUT', error: 'The recipe provider timed out.' });
      }
      return response.status(502).json({ code: 'UPSTREAM_UNAVAILABLE', error: 'The recipe provider is unavailable.' });
    }
  });

  app.use((error, _request, response, _next) => {
    if (error.message === 'Origin not allowed') {
      return response.status(403).json({ code: 'ORIGIN_NOT_ALLOWED', error: 'Origin not allowed.' });
    }
    console.error('Recipe API request failed:', error);
    return response.status(500).json({ code: 'INTERNAL_ERROR', error: 'Internal server error.' });
  });

  return app;
}

function parseInteger(value, defaultValue) {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function getCached(cache, key, currentTime) {
  const cached = cache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= currentTime) {
    cache.delete(key);
    return null;
  }
  return cached.value;
}

function setCached(cache, key, value, expiresAt) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, { value, expiresAt });
  while (cache.size > CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}
