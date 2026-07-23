import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

type Habit = {
  id: number
  name: string
  description: string
  color: string
  streak: number
  target: number
  completed: number
}

type Achievement = {
  id: number
  title: string
  description: string
  unlocked: boolean
}

const initialHabits: Habit[] = [
  { id: 1, name: 'Meditación', description: '10 minutos', color: '#4f46e5', streak: 6, target: 7, completed: 5 },
  { id: 2, name: 'Ejercicio', description: '30 minutos', color: '#f59e0b', streak: 4, target: 5, completed: 4 },
  { id: 3, name: 'Leer', description: '20 minutos', color: '#10b981', streak: 8, target: 7, completed: 6 },
]

const initialAchievements: Achievement[] = [
  { id: 1, title: 'Racha de oro', description: 'Mantén 7 días seguidos', unlocked: true },
  { id: 2, title: 'Ángel del hábito', description: 'Completa 3 hábitos en una semana', unlocked: false },
  { id: 3, title: 'Constancia total', description: 'Cumple tu meta de 5 días', unlocked: true },
]

const STORAGE_KEY = 'habit-tracker-data'

function loadStoredData() {
  if (typeof window === 'undefined') {
    return { habits: initialHabits, achievements: initialAchievements }
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return { habits: initialHabits, achievements: initialAchievements }
    }

    const parsed = JSON.parse(saved) as { habits?: Habit[]; achievements?: Achievement[] }
    return {
      habits: Array.isArray(parsed.habits) && parsed.habits.length > 0 ? parsed.habits : initialHabits,
      achievements: Array.isArray(parsed.achievements) && parsed.achievements.length > 0 ? parsed.achievements : initialAchievements,
    }
  } catch {
    return { habits: initialHabits, achievements: initialAchievements }
  }
}

function App() {
  const storedData = useMemo(() => loadStoredData(), [])
  const [habits, setHabits] = useState<Habit[]>(storedData.habits)
  const [achievements] = useState<Achievement[]>(storedData.achievements)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ habits, achievements }))
  }, [achievements, habits])

  const progressData = useMemo(() => habits.map((habit) => ({
    name: habit.name,
    progreso: Math.round((habit.completed / habit.target) * 100),
  })), [habits])

  const completedCount = habits.filter((habit) => habit.completed >= habit.target).length
  const totalStreak = habits.reduce((sum, habit) => sum + habit.streak, 0)

  const toggleHabit = (id: number) => {
    setHabits((current) =>
      current.map((habit) =>
        habit.id === id
          ? { ...habit, completed: Math.min(habit.target, habit.completed + 1), streak: habit.streak + 1 }
          : habit,
      ),
    )
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">App de hábitos</p>
          <h1>Construye rutinas que realmente duren</h1>
          <p className="hero-text">Combina seguimiento diario, recompensas y una visión visual de tu progreso.</p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{completedCount}</strong>
            <span>Hábitos cumplidos</span>
          </div>
          <div>
            <strong>{totalStreak}</strong>
            <span>Días de racha</span>
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Hábitos del día</h2>
            <button className="ghost-btn">Recordatorio</button>
          </div>
          <div className="habit-list">
            {habits.map((habit) => (
              <article key={habit.id} className="habit-card">
                <div className="habit-info">
                  <div className="habit-color" style={{ backgroundColor: habit.color }} />
                  <div>
                    <h3>{habit.name}</h3>
                    <p>{habit.description}</p>
                  </div>
                </div>
                <div className="habit-actions">
                  <span className="streak-pill">🔥 {habit.streak} días</span>
                  <button onClick={() => toggleHabit(habit.id)}>
                    +1 {habit.completed}/{habit.target}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Progreso semanal</h2>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="progreso" radius={[8, 8, 0, 0]}>
                  {progressData.map((entry, index) => (
                    <Cell key={entry.name} fill={habits[index].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="content-grid lower-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Logros</h2>
          </div>
          <div className="achievement-list">
            {achievements.map((achievement) => (
              <div key={achievement.id} className={`achievement-card ${achievement.unlocked ? 'unlocked' : ''}`}>
                <h3>{achievement.title}</h3>
                <p>{achievement.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Sincronización</h2>
          </div>
          <div className="sync-card">
            <p>Conecta tu app con Supabase para guardar hábitos, logros y metas en la nube.</p>
            <code>{'supabase.from("habits").insert({...})'}</code>
            <button className="ghost-btn">Configurar Supabase</button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
