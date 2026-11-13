import { ChangeEvent, CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  createInitialStore,
  getCalendarDays,
  getHabitPeriodProgress,
  getPeriodRange,
  getStreak,
  isCompletedOn,
  migrateLegacyStore,
  Period,
  STORAGE_KEY,
  toDateKey,
  toggleCompletion,
  validateHabitStore,
  Habit,
  Achievement,
  HabitStore,
} from './habitUtils'

type LoadedStore = {
  store: HabitStore
  warning: string
}

function loadStore(): LoadedStore {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return { store: createInitialStore(), warning: '' }

    const parsed: unknown = JSON.parse(saved)
    if (
      parsed
      && typeof parsed === 'object'
      && 'version' in parsed
      && parsed.version === 2
    ) {
      return { store: validateHabitStore(parsed), warning: '' }
    }

    return {
      store: migrateLegacyStore(parsed),
      warning: 'Actualizamos tus hábitos. Las marcas anteriores no tenían fecha, por eso el historial comienza vacío.',
    }
  } catch (error) {
    return {
      store: createInitialStore(),
      warning: `No se pudieron leer los datos guardados: ${error instanceof Error ? error.message : 'formato desconocido'}. Puedes importar un respaldo para recuperarlos.`,
    }
  }
}

function downloadFile(filename: string, contents: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function escapeCsv(value: string | number) {
  const text = String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function App() {
  const [loadedStore] = useState(loadStore)
  const [habits, setHabits] = useState<Habit[]>(loadedStore.store.habits)
  const [achievements, setAchievements] = useState<Achievement[]>(loadedStore.store.achievements)
  const [period, setPeriod] = useState<Period>('week')
  const [habitFilter, setHabitFilter] = useState('all')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [notice, setNotice] = useState(loadedStore.warning)
  const [dirty, setDirty] = useState(false)
  const importInput = useRef<HTMLInputElement>(null)
  const today = new Date()
  const todayKey = toDateKey(today)
  const visibleHabits = habitFilter === 'all'
    ? habits
    : habits.filter((habit) => String(habit.id) === habitFilter)
  const selectedHabit = habits.find((habit) => String(habit.id) === habitFilter)

  useEffect(() => {
    if (!dirty) return
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 2, habits, achievements }),
      )
      setDirty(false)
    } catch (error) {
      setNotice(`No se pudo guardar en este navegador: ${error instanceof Error ? error.message : 'error de almacenamiento'}`)
    }
  }, [achievements, dirty, habits])

  const progressData = useMemo(
    () => visibleHabits.map((habit) => ({
      name: habit.name,
      progreso: getHabitPeriodProgress(habit, period, today).percent,
      color: habit.color,
    })),
    [period, todayKey, visibleHabits],
  )

  const periodTotals = visibleHabits.reduce(
    (totals, habit) => {
      const progress = getHabitPeriodProgress(habit, period, today)
      totals.completed += progress.completed
      totals.goal += progress.goal
      return totals
    },
    { completed: 0, goal: 0 },
  )
  const periodPercent = periodTotals.goal
    ? Math.min(100, Math.round((periodTotals.completed / periodTotals.goal) * 100))
    : 0
  const completedToday = habits.filter((habit) => isCompletedOn(habit, today)).length
  const totalStreak = habits.reduce((sum, habit) => sum + getStreak(habit, today), 0)
  const calendarDays = getCalendarDays(calendarMonth)
  const calendarHabitList = selectedHabit ? [selectedHabit] : habits
  const maxDateKey = todayKey

  const markHabit = (id: number, date: Date) => {
    if (toDateKey(date) > maxDateKey) return
    setHabits((current) => current.map((habit) => (
      habit.id === id ? toggleCompletion(habit, date) : habit
    )))
    setDirty(true)
    setNotice('')
  }

  const exportBackup = () => {
    const backup: HabitStore = { version: 2, habits, achievements }
    downloadFile(
      `respaldo-habitos-${todayKey}.json`,
      JSON.stringify(backup, null, 2),
      'application/json',
    )
    setNotice('Respaldo JSON descargado.')
  }

  const exportCsv = () => {
    const rows = [
      ['id', 'habito', 'descripcion', 'fecha', 'objetivo_semanal'],
      ...habits.flatMap((habit) => habit.completionDates.map((date) => [
        habit.id,
        habit.name,
        habit.description,
        date,
        habit.target,
      ])),
    ]
    downloadFile(
      `registros-habitos-${todayKey}.csv`,
      rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n'),
      'text/csv;charset=utf-8',
    )
    setNotice('Registros CSV descargados.')
  }

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const parsed: unknown = JSON.parse(await file.text())
      const restored = validateHabitStore(parsed)
      setHabits(restored.habits)
      setAchievements(restored.achievements)
      setDirty(true)
      setNotice('Respaldo restaurado correctamente.')
      setHabitFilter('all')
    } catch (error) {
      setNotice(`No se pudo restaurar el respaldo: ${error instanceof Error ? error.message : 'archivo inválido'}`)
    } finally {
      event.target.value = ''
    }
  }

  const moveCalendar = (offset: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const [periodStart, periodEnd] = getPeriodRange(period, today)
  const periodLabel = period === 'week' ? 'semanal' : 'mensual'

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">App de hábitos</p>
          <h1>Construye rutinas que realmente duren</h1>
          <p className="hero-text">Registra tus hábitos, descubre tu constancia y revisa tu progreso en el calendario.</p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{completedToday}/{habits.length}</strong>
            <span>Hábitos de hoy</span>
          </div>
          <div>
            <strong>{totalStreak}</strong>
            <span>Días de racha acumulados</span>
          </div>
        </div>
      </section>

      <section className="panel progress-panel">
        <div className="panel-header progress-header">
          <div>
            <h2>Cumplimiento {periodLabel}</h2>
            <p className="muted">
              {periodStart.toLocaleDateString('es', { day: 'numeric', month: 'short' })}
              {' – '}
              {periodEnd.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="period-switch" role="group" aria-label="Período de cumplimiento">
            <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>Semanal</button>
            <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>Mensual</button>
          </div>
        </div>
        <div className="completion-summary">
          <strong>{periodPercent}%</strong>
          <span>{periodTotals.completed} de {periodTotals.goal} días objetivo completados</span>
        </div>
        <div className="summary-track" role="progressbar" aria-label={`Cumplimiento ${periodLabel}`} aria-valuenow={periodPercent} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${periodPercent}%` }} />
        </div>
        {period === 'month' && (
          <p className="muted period-note">La meta mensual se ajusta proporcionalmente a los días del mes.</p>
        )}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header habit-header">
            <div>
              <h2>Hábitos del día</h2>
              <p className="muted">Marca cada hábito al completarlo. Puedes cambiar la fecha desde el calendario.</p>
            </div>
            <label className="filter-control">
              <span>Filtrar hábito</span>
              <select value={habitFilter} onChange={(event) => setHabitFilter(event.target.value)}>
                <option value="all">Todos</option>
                {habits.map((habit) => <option key={habit.id} value={habit.id}>{habit.name}</option>)}
              </select>
            </label>
          </div>
          <div className="habit-list">
            {visibleHabits.length === 0 && <p className="empty-state">No hay hábitos para mostrar.</p>}
            {visibleHabits.map((habit) => {
              const progress = getHabitPeriodProgress(habit, period, today)
              const completedTodayForHabit = isCompletedOn(habit, today)
              return (
                <article key={habit.id} className="habit-card">
                  <div className="habit-info">
                    <div className="habit-color" style={{ backgroundColor: habit.color }} />
                    <div>
                      <h3>{habit.name}</h3>
                      <p>{habit.description} · meta {habit.target} días/semana</p>
                    </div>
                  </div>
                  <div className="habit-actions">
                    <span className="streak-pill">🔥 {getStreak(habit, today)} días</span>
                    <button
                      className={completedTodayForHabit ? 'complete-btn is-complete' : 'complete-btn'}
                      aria-pressed={completedTodayForHabit}
                      onClick={() => markHabit(habit.id, today)}
                    >
                      {completedTodayForHabit ? '✓ Hecho hoy' : 'Marcar hoy'}
                    </button>
                  </div>
                  <div className="habit-progress">
                    <div className="habit-progress-label">
                      <span>{period === 'week' ? 'Esta semana' : 'Este mes'}</span>
                      <span>{progress.completed}/{progress.goal} · {progress.percent}%</span>
                    </div>
                    <div className="summary-track">
                      <span style={{ width: `${progress.percent}%`, backgroundColor: habit.color }} />
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Cumplimiento por hábito</h2>
              <p className="muted">Progreso en el período seleccionado</p>
            </div>
          </div>
          <div className="chart-box">
            {progressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={progressData} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip formatter={(value) => [`${value}%`, 'Cumplimiento']} />
                  <Bar dataKey="progreso" radius={[8, 8, 0, 0]}>
                    {progressData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="empty-state">Selecciona un hábito para ver su progreso.</p>}
          </div>
        </div>
      </section>

      <section className="panel calendar-panel">
        <div className="panel-header calendar-header">
          <div>
            <h2>Calendario de actividad</h2>
            <p className="muted">
              {selectedHabit
                ? `Selecciona un día para marcar o quitar ${selectedHabit.name}.`
                : 'Filtra por un hábito para editar sus marcas en el calendario.'}
            </p>
          </div>
          <div className="calendar-navigation">
            <button aria-label="Mes anterior" onClick={() => moveCalendar(-1)}>‹</button>
            <strong>{calendarMonth.toLocaleDateString('es', { month: 'long', year: 'numeric' })}</strong>
            <button
              aria-label="Mes siguiente"
              onClick={() => moveCalendar(1)}
              disabled={calendarMonth.getFullYear() === today.getFullYear() && calendarMonth.getMonth() >= today.getMonth()}
            >›</button>
          </div>
        </div>
        <div className="calendar-grid calendar-weekdays">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="calendar-grid calendar-days">
          {calendarDays.map((day, index) => {
            if (!day) return <span className="calendar-empty" key={`empty-${index}`} />
            const completedCount = calendarHabitList.filter((habit) => isCompletedOn(habit, day)).length
            const isFuture = toDateKey(day) > maxDateKey
            const isToday = toDateKey(day) === todayKey
            const isComplete = selectedHabit
              ? isCompletedOn(selectedHabit, day)
              : completedCount === habits.length && habits.length > 0
            return (
              <button
                key={toDateKey(day)}
                className={`calendar-day${isComplete ? ' is-complete' : ''}${isToday ? ' is-today' : ''}`}
                style={selectedHabit && isComplete ? { '--habit-color': selectedHabit.color } as CSSProperties : undefined}
                aria-label={`${day.toLocaleDateString('es', { dateStyle: 'long' })}: ${completedCount} ${completedCount === 1 ? 'hábito completado' : 'hábitos completados'}`}
                aria-pressed={selectedHabit ? isComplete : undefined}
                disabled={!selectedHabit || isFuture}
                onClick={() => selectedHabit && markHabit(selectedHabit.id, day)}
              >
                <span>{day.getDate()}</span>
                <small>{completedCount > 0 ? `${completedCount}/${calendarHabitList.length}` : '·'}</small>
              </button>
            )
          })}
        </div>
        <p className="calendar-legend"><span /> Día completado · El calendario muestra días registrados por hábito</p>
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
            <div>
              <h2>Exportar y respaldar</h2>
              <p className="muted">Tus datos se guardan en este navegador. Crea un respaldo para conservarlos.</p>
            </div>
          </div>
          <div className="backup-actions">
            <button className="primary-btn" onClick={exportBackup}>Descargar respaldo JSON</button>
            <button className="ghost-btn" onClick={exportCsv}>Exportar registros CSV</button>
            <button className="ghost-btn" onClick={() => importInput.current?.click()}>Restaurar respaldo JSON</button>
            <input
              ref={importInput}
              className="visually-hidden"
              type="file"
              accept="application/json,.json"
              onChange={importBackup}
              aria-label="Seleccionar respaldo JSON"
            />
          </div>
        </div>
      </section>
      {notice && <p className="notice" role="status">{notice}</p>}
    </main>
  )
}

export default App
