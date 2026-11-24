import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeApiError, RecipePage, searchRecipes } from '../services/spoonacular';
import { useAppContext, DIET_FILTERS } from '../context/AppContext';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TabParamList, RootStackParamList } from '../../App';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const requestId = useRef(0);
  const loadingMoreRef = useRef(false);
  const { selectedDiet, setSelectedDiet } = useAppContext();

  useEffect(() => {
    void loadRecipes(searchQuery, selectedDiet);
    return () => {
      requestId.current += 1;
    };
  }, [selectedDiet]);

  const errorMessage = (apiError: unknown): string => {
    if (!(apiError instanceof RecipeApiError)) {
      return apiError instanceof Error ? apiError.message : 'No se pudieron cargar las recetas.';
    }
    if (apiError.kind === 'configuration') return apiError.message;
    if (apiError.kind === 'network') return 'No hay conexión con el servidor de recetas. Revisa la red e inténtalo de nuevo.';
    if (apiError.kind === 'rate_limited') return 'Se alcanzó el límite de consultas de Spoonacular. Inténtalo más tarde.';
    if (apiError.kind === 'invalid_response') return 'El servidor devolvió datos de recetas inválidos.';
    return apiError.message;
  };

  const warningMessage = (page: RecipePage): string | null => {
    if (!page.fromCache) return null;
    if (page.warning?.kind === 'rate_limited') return 'Mostrando resultados guardados: el proveedor limitó las consultas.';
    if (page.warning?.kind === 'network') return 'Sin conexión con el servidor; se muestran resultados guardados.';
    if (page.warning) return 'El servidor no pudo actualizar los resultados guardados.';
    return null;
  };

  const loadRecipes = async (query = searchQuery, diet = selectedDiet) => {
    const currentRequestId = ++requestId.current;
    setActiveQuery(query);
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setLoading(true);
    setError(null);
    setWarning(null);
    setRecipes([]);
    setTotalResults(0);
    try {
      const page = await searchRecipes(query, diet, 0);
      if (currentRequestId !== requestId.current) return;
      setRecipes(page.results);
      setTotalResults(page.totalResults);
      setWarning(warningMessage(page));
    } catch (requestError) {
      if (currentRequestId === requestId.current) setError(errorMessage(requestError));
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loading || loadingMore || loadingMoreRef.current || recipes.length >= totalResults) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);
    const currentRequestId = requestId.current;
    try {
      const page = await searchRecipes(activeQuery, selectedDiet, recipes.length);
      if (currentRequestId !== requestId.current) return;
      setRecipes((current) => {
        const existingIds = new Set(current.map((recipe) => recipe.id));
        return [...current, ...page.results.filter((recipe) => !existingIds.has(recipe.id))];
      });
      setTotalResults(page.totalResults);
      setWarning(warningMessage(page));
    } catch (requestError) {
      if (currentRequestId === requestId.current) setError(errorMessage(requestError));
    } finally {
      if (currentRequestId === requestId.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🍳 Recetas App</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar recetas..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => void loadRecipes()}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => void loadRecipes()}>
          <Ionicons name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {DIET_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              selectedDiet === filter.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedDiet(filter.id)}
          >
            <Text style={styles.filterIcon}>{filter.icon}</Text>
            <Text
              style={[
                styles.filterText,
                selectedDiet === filter.id && styles.filterTextActive,
              ]}
            >
              {filter.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {warning && <Text style={styles.warningText}>{warning}</Text>}
      {error && !recipes.length ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void loadRecipes()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Cargando recetas...</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={(
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron recetas para esta búsqueda.</Text>
            </View>
          )}
          ListFooterComponent={(
            loadingMore
              ? <ActivityIndicator style={styles.footer} color="#f59e0b" />
              : error
                ? (
                  <View style={styles.footerError}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => void loadMore()}>
                      <Text style={styles.retryText}>Reintentar</Text>
                    </TouchableOpacity>
                  </View>
                )
                : recipes.length > 0 && recipes.length < totalResults
                  ? <Text style={styles.loadingText}>Desliza para cargar más recetas</Text>
                  : null
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  filterIcon: {
    fontSize: 18,
  },
  filterText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  warningText: {
    color: '#fcd34d',
    fontSize: 13,
    paddingHorizontal: 20,
    paddingBottom: 8,
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
  emptyContainer: {
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 16,
  },
  footer: {
    marginVertical: 20,
  },
  footerError: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
