import { StatusBar } from 'expo-status-bar'; 
import { StyleSheet, Text, View, Alert, ScrollView } from 'react-native'; 
import FAB from './components/FAB'; 
import { useCounter } from './hooks/useCounter';

export default function App() { 
  const { count, history, increase, decrease, reset } = useCounter(0);

  const handleReset = () => {
    Alert.alert(
      "Confirmar",
      "¿Estás seguro de que quieres reiniciar el contador?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Reiniciar", onPress: reset, style: "destructive" }
      ]
    );
  };

  return ( 
    <View style={styles.container}> 
      <Text style={styles.title}>Contador (0-20)</Text>
      <Text style={styles.textHuge}>{count}</Text> 

      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Historial:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={styles.historyText}>
            {history.join(' → ')}
          </Text>
        </ScrollView>
      </View>

      <FAB 
        label="+1" 
        onPress={increase} 
        onLongPress={handleReset} 
        position="right" 
        color="#4CD964"
      /> 

      <FAB 
        label="-1" 
        onPress={decrease} 
        position="right" 
        color="#FF3B30"
        style={{ bottom: 80 }} // Note: I need to update FAB to support extra styles if I want multiple on same side, or just put one on left
      /> 

      <FAB 
        label="Reset" 
        onPress={handleReset} 
        position="left" 
        color="#5856D6"
      /> 

      <StatusBar style="auto" /> 
    </View> 
  ); 
} 

const styles = StyleSheet.create({ 
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    alignItems: 'center', 
    justifyContent: 'center', 
  }, 
  title: {
    fontSize: 20,
    marginBottom: 10,
    color: '#666',
  },
  textHuge: { 
    fontSize: 120, 
    fontWeight: "bold", 
    color: "#000", 
  }, 
  historyContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  historyText: {
    fontSize: 14,
    color: '#888',
  }
});
