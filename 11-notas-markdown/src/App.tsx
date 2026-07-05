import React from 'react'
import { SupabaseProvider, useSupabase } from './context/SupabaseContext'
import { AuthScreen } from './screens/AuthScreen'
import { HomeScreen } from './screens/HomeScreen'

const AppContent: React.FC = () => {
  const { user, loading } = useSupabase()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold">Cargando...</div>
      </div>
    )
  }

  return user ? <HomeScreen /> : <AuthScreen />
}

const App: React.FC = () => {
  return (
    <SupabaseProvider>
      <AppContent />
    </SupabaseProvider>
  )
}

export default App
