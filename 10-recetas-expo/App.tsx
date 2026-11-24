import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppProvider, useAppContext } from './src/context/AppContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { RecipeDetailScreen } from './src/screens/RecipeDetailScreen';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { ShoppingListScreen } from './src/screens/ShoppingListScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  RecipeDetail: { recipeId: number };
};

export type TabParamList = {
  Home: undefined;
  Favorites: undefined;
  ShoppingList: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else {
            iconName = focused ? 'cart' : 'cart-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ tabBarLabel: 'Favoritos' }} />
      <Tab.Screen name="ShoppingList" component={ShoppingListScreen} options={{ tabBarLabel: 'Lista' }} />
    </Tab.Navigator>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppShell />
      <StatusBar style="light" />
    </AppProvider>
  );
};

const AppShell: React.FC = () => {
  const { ready, persistenceError, retryPersistence } = useAppContext();

  if (!ready) {
    return (
      <View style={styles.statusContainer}>
        {persistenceError ? (
          <>
            <Text style={styles.statusError}>{persistenceError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => void retryPersistence()}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.statusText}>Cargando datos guardados...</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      {persistenceError && (
        <View style={styles.persistenceBanner}>
          <Text style={styles.persistenceError}>{persistenceError}</Text>
          <TouchableOpacity onPress={() => void retryPersistence()}>
            <Text style={styles.persistenceRetry}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: '#0f172a',
  },
  statusText: {
    color: '#cbd5e1',
    textAlign: 'center',
  },
  statusError: {
    color: '#fca5a5',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  persistenceBanner: {
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  persistenceError: {
    color: '#fee2e2',
    flex: 1,
    fontSize: 12,
  },
  persistenceRetry: {
    color: '#fde68a',
    fontWeight: '700',
  },
});

export default App;
