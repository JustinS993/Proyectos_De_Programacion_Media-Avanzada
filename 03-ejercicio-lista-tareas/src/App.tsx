import ListaTareas from './components/ListaTareas'
import logoUnimayor from './assets/logo-unimayor.png'
import './App.css'

function App() {
  return (
    <main className="app">
      <img className="corner-logo" src={logoUnimayor} alt="Logo Unimayor" />
      <h1>Ejercicio 2: Lista de Tareas</h1>
      <p className="page-subtitle">Practica de listas, objetos literales e interfaces.</p>
      <ListaTareas />
    </main>
  )
}

export default App
