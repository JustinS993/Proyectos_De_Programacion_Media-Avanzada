import { Recipe } from '../types';

// Obtén tu API key gratuita en https://spoonacular.com/food-api/console#Profile
const API_KEY = 'TU_API_KEY_AQUI'; // Reemplaza esto con tu API key
const BASE_URL = 'https://api.spoonacular.com/recipes';

export const searchRecipes = async (query: string, diet: string = ''): Promise<Recipe[]> => {
  try {
    let url = `${BASE_URL}/complexSearch?apiKey=${API_KEY}&number=20&addRecipeInformation=true&fillIngredients=true`;
    
    if (query) {
      url += `&query=${encodeURIComponent(query)}`;
    }
    
    if (diet) {
      url += `&diet=${diet}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      // Fallback a datos de ejemplo si la API falla
      return getMockRecipes();
    }
    
    const data = await response.json();
    return data.results || getMockRecipes();
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return getMockRecipes();
  }
};

export const getRecipeDetails = async (id: number): Promise<Recipe | null> => {
  try {
    const url = `${BASE_URL}/${id}/information?apiKey=${API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return getMockRecipe(id);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching recipe details:', error);
    return getMockRecipe(id);
  }
};

// Datos de ejemplo para cuando la API no funcione
const getMockRecipes = (): Recipe[] => [
  {
    id: 1,
    title: 'Pasta Carbonara',
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=312&h=231&fit=crop',
    readyInMinutes: 30,
    servings: 4,
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    dairyFree: false,
    aggregateLikes: 234,
    healthScore: 65,
    pricePerServing: 1.5,
    extendedIngredients: [
      { id: 1001, name: 'spaghetti', amount: 400, unit: 'g', original: '400g spaghetti' },
      { id: 1002, name: 'eggs', amount: 4, unit: 'units', original: '4 eggs' },
      { id: 1003, name: 'pecorino romano', amount: 100, unit: 'g', original: '100g pecorino romano' },
      { id: 1004, name: 'guanciale', amount: 150, unit: 'g', original: '150g guanciale' },
    ],
    summary: 'Pasta carbonara clásica italiana con huevos, queso pecorino y guanciale.',
    instructions: 'Cocina la pasta. Fríe el guanciale. Mezcla huevos y queso. Combina todo.',
  },
  {
    id: 2,
    title: 'Ensalada César',
    image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=312&h=231&fit=crop',
    readyInMinutes: 15,
    servings: 2,
    vegetarian: false,
    vegan: false,
    glutenFree: true,
    dairyFree: false,
    aggregateLikes: 156,
    healthScore: 78,
    pricePerServing: 2.3,
    extendedIngredients: [
      { id: 2001, name: 'romaine lettuce', amount: 1, unit: 'head', original: '1 head romaine lettuce' },
      { id: 2002, name: 'parmesan', amount: 50, unit: 'g', original: '50g parmesan' },
      { id: 2003, name: 'croutons', amount: 100, unit: 'g', original: '100g croutons' },
    ],
    summary: 'Ensalada César clásica con lechuga romana, queso parmesano y picatostes.',
    instructions: 'Lava y corta la lechuga. Prepara el aderezo. Mezcla todo.',
  },
  {
    id: 3,
    title: 'Tacos al Pastor',
    image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=312&h=231&fit=crop',
    readyInMinutes: 45,
    servings: 6,
    vegetarian: false,
    vegan: false,
    glutenFree: true,
    dairyFree: true,
    aggregateLikes: 345,
    healthScore: 70,
    pricePerServing: 1.2,
    extendedIngredients: [
      { id: 3001, name: 'pork', amount: 500, unit: 'g', original: '500g pork' },
      { id: 3002, name: 'pineapple', amount: 1, unit: 'unit', original: '1 pineapple' },
      { id: 3003, name: 'corn tortillas', amount: 12, unit: 'units', original: '12 corn tortillas' },
    ],
    summary: 'Deliciosos tacos al pastor con carne adobada y piña.',
    instructions: 'Marina la carne. Asa la carne y la piña. Prepara los tacos.',
  },
];

const getMockRecipe = (id: number): Recipe => {
  const recipes = getMockRecipes();
  return recipes.find(r => r.id === id) || recipes[0];
};
