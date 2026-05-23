import Contador from './components/Contador'
import logoUnimayor from './assets/logo-unimayor.png'
import './App.css'

function App() {
  return (
    <main className="app">
      <img className="corner-logo" src={logoUnimayor} alt="Logo Unimayor" />
      <h1>Ejercicio 1: Contador</h1>
      <p className="page-subtitle">Practica de useState con acciones basicas.</p>
      <Contador />
    </main>
  )
}

export default App
