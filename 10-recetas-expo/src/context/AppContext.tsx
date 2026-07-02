import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DIET_FILTERS: DietFilter[] = [
  { id: '', name: 'Todos', icon: '🍽️' },
  { id: 'vegetarian', name: 'Vegetariano', icon: '🥗' },
  { id: 'vegan', name: 'Vegano', icon: '🌱' },
  { id: 'gluten_free', name: 'Sin Gluten', icon: '🌾' },
  { id: 'dairy_free', name: 'Sin Lácteos', icon: '🥛' },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [selectedDiet, setSelectedDiet] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [favoritesData, shoppingData, dietData] = await Promise.all([
        AsyncStorage.getItem('favorites'),
        AsyncStorage.getItem('shoppingList'),
        AsyncStorage.getItem('selectedDiet'),
      ]);

      if (favoritesData) setFavorites(JSON.parse(favoritesData));
      if (shoppingData) setShoppingList(JSON.parse(shoppingData));
      if (dietData) setSelectedDiet(dietData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveFavorites = async (newFavorites: Recipe[]) => {
    try {
      await AsyncStorage.setItem('favorites', JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const saveShoppingList = async (newList: ShoppingListItem[]) => {
    try {
      await AsyncStorage.setItem('shoppingList', JSON.stringify(newList));
    } catch (error) {
      console.error('Error saving shopping list:', error);
    }
  };

  const saveDiet = async (diet: string) => {
    try {
      await AsyncStorage.setItem('selectedDiet', diet);
    } catch (error) {
      console.error('Error saving diet:', error);
    }
  };

  const addFavorite = (recipe: Recipe) => {
    const newFavorites = [...favorites, recipe];
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  };

  const removeFavorite = (recipeId: number) => {
    const newFavorites = favorites.filter(r => r.id !== recipeId);
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  };

  const isFavorite = (recipeId: number) => {
    return favorites.some(r => r.id === recipeId);
  };

  const addToShoppingList = (recipe: Recipe) => {
    if (!recipe.extendedIngredients) return;
    
    const newItems: ShoppingListItem[] = recipe.extendedIngredients.map(ing => ({
      id: `${recipe.id}-${ing.id}`,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      checked: false,
    }));

    const existingIds = new Set(shoppingList.map(item => item.id));
    const filteredNewItems = newItems.filter(item => !existingIds.has(item.id));
    
    const updatedList = [...shoppingList, ...filteredNewItems];
    setShoppingList(updatedList);
    saveShoppingList(updatedList);
  };

  const toggleShoppingItem = (itemId: string) => {
    const updatedList = shoppingList.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setShoppingList(updatedList);
    saveShoppingList(updatedList);
  };

  const removeShoppingItem = (itemId: string) => {
    const updatedList = shoppingList.filter(item => item.id !== itemId);
    setShoppingList(updatedList);
    saveShoppingList(updatedList);
  };

  const clearShoppingList = () => {
    setShoppingList([]);
    saveShoppingList([]);
  };

  const handleSetSelectedDiet = (diet: string) => {
    setSelectedDiet(diet);
    saveDiet(diet);
  };

  return (
    <AppContext.Provider
      value={{
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        shoppingList,
        addToShoppingList,
        toggleShoppingItem,
        removeShoppingItem,
        clearShoppingList,
        selectedDiet,
        setSelectedDiet: handleSetSelectedDiet,
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

export { DIET_FILTERS };
