import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, ShoppingListItem, DietFilter } from '../types';

interface AppContextType {
  favorites: Recipe[];
  addFavorite: (recipe: Recipe) => void;
  removeFavorite: (recipeId: number) => void;
  isFavorite: (recipeId: number) => boolean;
  shoppingList: ShoppingListItem[];
  addToShoppingList: (recipe: Recipe) => void;
  toggleShoppingItem: (itemId: string) => void;
  removeShoppingItem: (itemId: string) => void;
  clearShoppingList: () => void;
  selectedDiet: string;
  setSelectedDiet: (diet: string) => void;
  ready: boolean;
  persistenceError: string | null;
  retryPersistence: () => Promise<void>;
}

interface PersistedAppState {
  version: 1;
  favorites: Recipe[];
  shoppingList: ShoppingListItem[];
  selectedDiet: string;
}

const STORAGE_KEY = '@recipes-app/state-v1';
const LEGACY_KEYS = ['favorites', 'shoppingList', 'selectedDiet'] as const;
const DEFAULT_DIET = '';
const VALID_DIETS = new Set(['', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free']);
const EMPTY_STATE: PersistedAppState = {
  version: 1,
  favorites: [],
  shoppingList: [],
  selectedDiet: DEFAULT_DIET,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const DIET_FILTERS: DietFilter[] = [
  { id: '', name: 'Todos', icon: '🍽️' },
  { id: 'vegetarian', name: 'Vegetariano', icon: '🥗' },
  { id: 'vegan', name: 'Vegano', icon: '🌱' },
  { id: 'gluten_free', name: 'Sin Gluten', icon: '🌾' },
  { id: 'dairy_free', name: 'Sin Lácteos', icon: '🥛' },
];

function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== 'object') return false;
  const recipe = value as Partial<Recipe>;
  return Number.isSafeInteger(recipe.id) && typeof recipe.title === 'string';
}

function isShoppingItem(value: unknown): value is ShoppingListItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ShoppingListItem>;
  return typeof item.id === 'string'
    && typeof item.name === 'string'
    && typeof item.amount === 'number'
    && typeof item.unit === 'string'
    && typeof item.checked === 'boolean';
}

function parsePersistedState(raw: string): PersistedAppState {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('El respaldo local tiene un formato inválido.');
  const state = value as Partial<PersistedAppState>;
  if (state.version !== 1 || !Array.isArray(state.favorites) || !Array.isArray(state.shoppingList)) {
    throw new Error('La versión de los datos guardados no es compatible.');
  }
  if (!state.favorites.every(isRecipe) || !state.shoppingList.every(isShoppingItem)) {
    throw new Error('Los datos guardados contienen recetas o ingredientes inválidos.');
  }
  if (typeof state.selectedDiet !== 'string' || !VALID_DIETS.has(state.selectedDiet)) {
    throw new Error('El filtro guardado no es válido.');
  }
  return {
    version: 1,
    favorites: state.favorites,
    shoppingList: state.shoppingList,
    selectedDiet: state.selectedDiet,
  };
}

async function loadPersistedState(): Promise<{ state: PersistedAppState; migrated: boolean }> {
  const current = await AsyncStorage.getItem(STORAGE_KEY);
  if (current) return { state: parsePersistedState(current), migrated: false };

  const [favoritesRaw, shoppingRaw, dietRaw] = await Promise.all(
    LEGACY_KEYS.map((key) => AsyncStorage.getItem(key)),
  );
  const favorites = favoritesRaw ? JSON.parse(favoritesRaw) as unknown : [];
  const shoppingList = shoppingRaw ? JSON.parse(shoppingRaw) as unknown : [];
  const selectedDiet = dietRaw || DEFAULT_DIET;

  if (!Array.isArray(favorites) || !favorites.every(isRecipe)) {
    throw new Error('Los favoritos guardados tienen un formato inválido.');
  }
  if (!Array.isArray(shoppingList) || !shoppingList.every(isShoppingItem)) {
    throw new Error('La lista de compras guardada tiene un formato inválido.');
  }
  if (!VALID_DIETS.has(selectedDiet)) {
    throw new Error('El filtro guardado no es válido.');
  }
  return {
    state: { version: 1, favorites, shoppingList, selectedDiet },
    migrated: [favoritesRaw, shoppingRaw, dietRaw].some((value) => value !== null),
  };
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PersistedAppState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const readyRef = useRef(false);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  const persist = useCallback((next: PersistedAppState) => {
    writeQueue.current = writeQueue.current.then(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        await Promise.all(LEGACY_KEYS.map((key) => AsyncStorage.removeItem(key)));
        setPersistenceError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudieron guardar los cambios.';
        setPersistenceError(`No se guardaron los cambios localmente: ${message}`);
      }
    });
  }, []);

  const hydrate = useCallback(async () => {
    setReady(false);
    readyRef.current = false;
    setPersistenceError(null);
    try {
      const loaded = await loadPersistedState();
      stateRef.current = loaded.state;
      setState(loaded.state);
      readyRef.current = true;
      setReady(true);
      if (loaded.migrated) persist(loaded.state);
    } catch (error) {
      setPersistenceError(error instanceof Error ? error.message : 'No se pudieron cargar los datos guardados.');
    }
  }, [persist]);

  const retryPersistence = useCallback(async () => {
    if (readyRef.current) {
      persist(stateRef.current);
      return;
    }
    await hydrate();
  }, [hydrate, persist]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const updateState = useCallback((updater: (current: PersistedAppState) => PersistedAppState) => {
    if (!readyRef.current) return;
    const next = updater(stateRef.current);
    stateRef.current = next;
    setState(next);
    persist(next);
  }, [persist]);

  const addFavorite = useCallback((recipe: Recipe) => {
    updateState((current) => current.favorites.some((item) => item.id === recipe.id)
      ? current
      : { ...current, favorites: [...current.favorites, recipe] });
  }, [updateState]);

  const removeFavorite = useCallback((recipeId: number) => {
    updateState((current) => ({
      ...current,
      favorites: current.favorites.filter((recipe) => recipe.id !== recipeId),
    }));
  }, [updateState]);

  const addToShoppingList = useCallback((recipe: Recipe) => {
    if (!recipe.extendedIngredients?.length) return;
    updateState((current) => {
      const existingIds = new Set(current.shoppingList.map((item) => item.id));
      const additions = recipe.extendedIngredients!
        .map((ingredient) => ({
          id: `${recipe.id}-${ingredient.id}`,
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit,
          checked: false,
        }))
        .filter((item) => !existingIds.has(item.id));
      return additions.length
        ? { ...current, shoppingList: [...current.shoppingList, ...additions] }
        : current;
    });
  }, [updateState]);

  const toggleShoppingItem = useCallback((itemId: string) => {
    updateState((current) => ({
      ...current,
      shoppingList: current.shoppingList.map((item) => (
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )),
    }));
  }, [updateState]);

  const removeShoppingItem = useCallback((itemId: string) => {
    updateState((current) => ({
      ...current,
      shoppingList: current.shoppingList.filter((item) => item.id !== itemId),
    }));
  }, [updateState]);

  const clearShoppingList = useCallback(() => {
    updateState((current) => ({ ...current, shoppingList: [] }));
  }, [updateState]);

  const setSelectedDiet = useCallback((diet: string) => {
    if (!VALID_DIETS.has(diet)) {
      setPersistenceError('El filtro seleccionado no es válido.');
      return;
    }
    updateState((current) => ({ ...current, selectedDiet: diet }));
  }, [updateState]);

  const isFavorite = useCallback(
    (recipeId: number) => state.favorites.some((recipe) => recipe.id === recipeId),
    [state.favorites],
  );

  return (
    <AppContext.Provider
      value={{
        favorites: state.favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        shoppingList: state.shoppingList,
        addToShoppingList,
        toggleShoppingItem,
        removeShoppingItem,
        clearShoppingList,
        selectedDiet: state.selectedDiet,
        setSelectedDiet,
        ready,
        persistenceError,
        retryPersistence,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
