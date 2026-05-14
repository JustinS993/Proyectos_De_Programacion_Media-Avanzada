import { useState } from 'react'

interface Tarea {
  id: number
  texto: string
  completed: boolean
}

const ListaTareas = () => {
  const [nuevaTarea, setNuevaTarea] = useState('')
  const [tareas, setTareas] = useState<Tarea[]>([])

  const addTask = () => {
    const textoLimpio = nuevaTarea.trim()
    if (!textoLimpio) return

    const tarea: Tarea = {
      id: Date.now(),
      texto: textoLimpio,
      completed: false,
    }

    setTareas((listaActual) => [...listaActual, tarea])
    setNuevaTarea('')
  }

  const removeTask = (id: number) => {
    setTareas((listaActual) => listaActual.filter((tarea) => tarea.id !== id))
  }

  const resetList = () => {
    setTareas([])
  }

  const toggleTask = (id: number) => {
    setTareas((listaActual) =>
      listaActual.map((tarea) =>
        tarea.id === id ? { ...tarea, completed: !tarea.completed } : tarea,
      ),
    )
  }

  return (
    <section className="card">
      <h2>Ejercicio 2: Lista de Tareas con Interfaz</h2>
      <div className="actions">
        <input
          type="text"
          placeholder="Escribe una tarea"
          value={nuevaTarea}
          onChange={(evento) => setNuevaTarea(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') addTask()
          }}
        />
        <button onClick={addTask}>Agregar tarea</button>
        <button className="button-muted" onClick={resetList}>
          Resetear lista
        </button>
      </div>

      <ul className="task-list">
        {tareas.map((tarea) => (
          <li key={tarea.id} className={tarea.completed ? 'done' : ''}>
            <span
              onClick={() => toggleTask(tarea.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter') toggleTask(tarea.id)
              }}
            >
              {tarea.texto}
            </span>
            <button onClick={() => removeTask(tarea.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
      {tareas.length === 0 && (
        <p className="empty-message">Aun no hay tareas. Agrega tu primera tarea.</p>
      )}
    </section>
  )
}

export default ListaTareas
