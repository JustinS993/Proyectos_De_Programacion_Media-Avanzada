import { useState } from 'react'

const Contador = () => {
  const [contador, setContador] = useState(0)

  const sumar = () => {
    setContador((valorActual) => valorActual + 1)
  }

  const restar = () => {
    setContador((valorActual) => valorActual - 1)
  }

  const resetear = () => {
    setContador(0)
  }

  return (
    <section className="card">
      <h2>Ejercicio 1: Contador</h2>
      <p className="value-pill">Valor actual: {contador}</p>
      <div className="actions">
        <button onClick={sumar}>Sumar +1</button>
        <button onClick={restar}>Restar -1</button>
        <button className="button-muted" onClick={resetear}>
          Resetear
        </button>
      </div>
    </section>
  )
}

export default Contador
