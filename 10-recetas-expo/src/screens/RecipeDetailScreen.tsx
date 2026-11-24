import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getRecipeDetails, RecipeApiError } from '../services/spoonacular';
import { Recipe } from '../types';
import { useAppContext } from '../context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';

type RecipeDetailScreenRouteProp = RouteProp<RootStackParamList, 'RecipeDetail'>;
type RecipeDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RecipeDetail'>;

interface Props {
  route: RecipeDetailScreenRouteProp;
  navigation: RecipeDetailScreenNavigationProp;
}

export const RecipeDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { recipeId } = route.params;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { isFavorite, addFavorite, removeFavorite, addToShoppingList } = useAppContext();
  const favorite = recipe ? isFavorite(recipe.id) : false;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setRecipe(null);
    setError(null);
    setWarning(null);
    getRecipeDetails(recipeId)
      .then((result) => {
        if (!active) return;
        setRecipe(result.recipe);
        if (result.warning?.kind === 'rate_limited') {
          setWarning('Mostrando datos guardados: el proveedor limitó las consultas.');
        } else if (result.warning?.kind === 'network') {
          setWarning('Sin conexión con el servidor; se muestran datos guardados.');
        } else if (result.warning) {
          setWarning('El servidor no pudo actualizar los datos guardados.');
        }
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof RecipeApiError && requestError.kind === 'rate_limited') {
          setError('Se alcanzó el límite de consultas de Spoonacular. Inténtalo más tarde.');
        } else if (requestError instanceof RecipeApiError && requestError.kind === 'network') {
          setError('No hay conexión con el servidor de recetas.');
        } else {
          setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar la receta.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [recipeId, reloadKey]);

  const toggleFavorite = () => {
    if (!recipe) return;
    if (favorite) {
      removeFavorite(recipe.id);
    } else {
      addFavorite(recipe);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Cargando receta...</Text>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error || 'No se encontró la receta'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setReloadKey((key) => key + 1)}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: recipe.image }} style={styles.image} />
          <LinearGradient
            colors={['transparent', 'rgba(15,23,42,0.95)']}
            style={styles.gradient}
          />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.favoriteBtn} onPress={toggleFavorite}>
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={28}
              color={favorite ? '#ef4444' : '#fff'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {warning && <Text style={styles.warningText}>{warning}</Text>}
          <Text style={styles.title}>{recipe.title}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={20} color="#f59e0b" />
              <Text style={styles.statText}>{recipe.readyInMinutes} min</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="people-outline" size={20} color="#f59e0b" />
              <Text style={styles.statText}>{recipe.servings} porciones</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="heart-outline" size={20} color="#f59e0b" />
              <Text style={styles.statText}>{recipe.aggregateLikes} likes</Text>
            </View>
          </View>

          <View style={styles.dietsContainer}>
            {recipe.vegetarian && <Text style={styles.dietTag}>🥗 Vegetariano</Text>}
            {recipe.vegan && <Text style={styles.dietTag}>🌱 Vegano</Text>}
            {recipe.glutenFree && <Text style={styles.dietTag}>🌾 Sin Gluten</Text>}
            {recipe.dairyFree && <Text style={styles.dietTag}>🥛 Sin Lácteos</Text>}
          </View>

          <TouchableOpacity
            style={styles.shoppingBtn}
            onPress={() => addToShoppingList(recipe)}
          >
            <Ionicons name="cart-outline" size={20} color="#fff" />
            <Text style={styles.shoppingBtnText}>Agregar a lista de compras</Text>
          </TouchableOpacity>

          {recipe.extendedIngredients && recipe.extendedIngredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🥘 Ingredientes</Text>
              {recipe.extendedIngredients.map((ing) => (
                <View key={ing.id} style={styles.ingredientItem}>
                  <View style={styles.ingredientBullet} />
                  <Text style={styles.ingredientText}>
                    {ing.amount} {ing.unit} {ing.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {recipe.instructions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Instrucciones</Text>
              <Text style={styles.instructionsText}>{recipe.instructions}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
  },
  warningText: {
    color: '#fcd34d',
    fontSize: 13,
    marginBottom: 12,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  imageContainer: {
    height: 300,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  dietsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  dietTag: {
    backgroundColor: '#1e293b',
    color: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '500',
  },
  shoppingBtn: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  shoppingBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  ingredientBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  ingredientText: {
    color: '#cbd5e1',
    fontSize: 15,
  },
  instructionsText: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 24,
  },
});
