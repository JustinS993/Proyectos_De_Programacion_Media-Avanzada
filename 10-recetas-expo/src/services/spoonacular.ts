import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_RECIPES_API_URL;
const CACHE_PREFIX = '@recipes-api/v1/';
const CACHE_INDEX_KEY = `${CACHE_PREFIX}index`;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 40;
const PAGE_SIZE = 20;

export type RecipeApiErrorKind = 'configuration' | 'network' | 'rate_limited' | 'server' | 'invalid_response' | 'not_found';

export class RecipeApiError extends Error {
  constructor(
    public readonly kind: RecipeApiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'RecipeApiError';
  }
}

export interface RecipeDetailsResult {
  recipe: Recipe;
  fromCache: boolean;
  warning?: RecipeApiError;
}

export interface RecipePage {
  results: Recipe[];
  totalResults: number;
  offset: number;
  number: number;
  fromCache: boolean;
  warning?: RecipeApiError;
}

interface CachedValue<T> {
  savedAt: number;
  value: T;
}

type ApiRecipePage = Pick<RecipePage, 'results' | 'totalResults' | 'offset' | 'number'>;

function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== 'object') return false;
  const recipe = value as Partial<Recipe>;
  return Number.isSafeInteger(recipe.id)
    && (recipe.id ?? 0) > 0
    && typeof recipe.title === 'string'
    && typeof recipe.image === 'string';
}

function isRecipePage(value: unknown): value is ApiRecipePage {
  if (!value || typeof value !== 'object') return false;
  const page = value as Partial<ApiRecipePage>;
  return Array.isArray(page.results)
    && page.results.every(isRecipe)
    && Number.isSafeInteger(page.totalResults)
    && (page.totalResults ?? -1) >= 0
    && Number.isSafeInteger(page.offset)
    && (page.offset ?? -1) >= 0
    && Number.isSafeInteger(page.number)
    && (page.number ?? 0) >= 1;
}

function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new RecipeApiError(
      'configuration',
      'Falta configurar EXPO_PUBLIC_RECIPES_API_URL para conectar con el servidor de recetas.',
    );
  }
  return API_BASE_URL.replace(/\/+$/, '');
}

function makeSearchKey(query: string, diet: string, offset: number): string {
  const search = new URLSearchParams({ query: query.trim().toLowerCase(), diet, offset: String(offset) });
  return `${CACHE_PREFIX}search/${search.toString()}`;
}

async function readCache<T>(key: string): Promise<{ value: T; fresh: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedValue<T>;
    if (!cached || typeof cached.savedAt !== 'number' || !('value' in cached)) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return { value: cached.value, fresh: Date.now() - cached.savedAt < CACHE_TTL_MS };
  } catch (error) {
    console.warn('No se pudo leer la caché local de recetas:', error);
    return null;
  }
}

async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    const rawIndex = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    const oldKeys: string[] = rawIndex ? JSON.parse(rawIndex) : [];
    const nextKeys = [key, ...oldKeys.filter((item) => item !== key)].slice(0, MAX_CACHE_ENTRIES);
    const evicted = oldKeys.filter((item) => !nextKeys.includes(item));
    await AsyncStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value } satisfies CachedValue<T>));
    await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(nextKeys));
    if (evicted.length) await Promise.all(evicted.map((item) => AsyncStorage.removeItem(item)));
  } catch (error) {
    console.warn('No se pudo guardar la caché local de recetas:', error);
  }
}

async function removeInvalidCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn('No se pudo eliminar una entrada inválida de la caché:', error);
  }
}

async function requestJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`);
  } catch (error) {
    throw new RecipeApiError(
      'network',
      error instanceof Error ? `No se pudo conectar con el servidor: ${error.message}` : 'No se pudo conectar con el servidor de recetas.',
    );
  }

  if (response.status === 429) {
    throw new RecipeApiError('rate_limited', 'Se alcanzó el límite de consultas de recetas. Inténtalo más tarde.', 429);
  }
  if (response.status === 404) {
    throw new RecipeApiError('not_found', 'No se encontró la receta solicitada.', 404);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new RecipeApiError(
      'server',
      body?.error || 'El servidor de recetas no pudo completar la solicitud.',
      response.status,
    );
  }

  try {
    return await response.json() as T;
  } catch {
    throw new RecipeApiError('invalid_response', 'El servidor devolvió una respuesta inválida.');
  }
}

export async function searchRecipes(query: string, diet = '', offset = 0): Promise<RecipePage> {
  const normalizedOffset = Math.max(0, Math.floor(offset));
  const cacheKey = makeSearchKey(query, diet, normalizedOffset);
  const cached = await readCache<RecipePage>(cacheKey);
  const validCached = cached && isRecipePage(cached.value) ? cached : null;
  if (cached && !validCached) await removeInvalidCache(cacheKey);
  if (validCached?.fresh) return { ...validCached.value, fromCache: true };

  const params = new URLSearchParams({
    query: query.trim(),
    diet,
    offset: String(normalizedOffset),
    number: String(PAGE_SIZE),
  });
  try {
    const page = await requestJson<unknown>(`/recipes?${params.toString()}`);
    if (!isRecipePage(page) || page.offset !== normalizedOffset || page.number !== PAGE_SIZE) {
      throw new RecipeApiError('invalid_response', 'El servidor devolvió una página de recetas inválida.');
    }
    const result: RecipePage = { ...page, fromCache: false };
    await writeCache(cacheKey, result);
    return result;
  } catch (error) {
    if (validCached) {
      const warning = error instanceof RecipeApiError
        ? error
        : new RecipeApiError('server', 'No se pudo actualizar la búsqueda.');
      return { ...validCached.value, fromCache: true, warning };
    }
    if (error instanceof RecipeApiError) throw error;
    throw new RecipeApiError('server', 'No se pudo completar la búsqueda de recetas.');
  }
}

const detailInFlight = new Map<number, Promise<RecipeDetailsResult>>();

export async function getRecipeDetails(id: number): Promise<RecipeDetailsResult> {
  const cacheKey = `${CACHE_PREFIX}detail/${id}`;
  const cached = await readCache<Recipe>(cacheKey);
  const validCached = cached && isRecipe(cached.value) ? cached : null;
  if (cached && !validCached) await removeInvalidCache(cacheKey);
  if (validCached?.fresh) return { recipe: validCached.value, fromCache: true };

  const existingRequest = detailInFlight.get(id);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    try {
      const recipe = await requestJson<Recipe>(`/recipes/${id}`);
      if (!isRecipe(recipe) || recipe.id !== id) {
        throw new RecipeApiError('invalid_response', 'El servidor devolvió los datos de receta incompletos.');
      }
      await writeCache(cacheKey, recipe);
      return { recipe, fromCache: false };
    } catch (error) {
      if (validCached) {
        const warning = error instanceof RecipeApiError
          ? error
          : new RecipeApiError('server', 'No se pudo actualizar el detalle de la receta.');
        return { recipe: validCached.value, fromCache: true, warning };
      }
      if (error instanceof RecipeApiError) throw error;
      throw new RecipeApiError('server', 'No se pudo cargar el detalle de la receta.');
    } finally {
      detailInFlight.delete(id);
    }
  })();
  detailInFlight.set(id, request);
  return request;
}
