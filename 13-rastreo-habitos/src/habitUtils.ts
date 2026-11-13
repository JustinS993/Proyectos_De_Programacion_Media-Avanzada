export type Habit = {
  id: number
  name: string
  description: string
  color: string
  target: number
  completionDates: string[]
}

export type Achievement = {
  id: number
  title: string
  description: string
  unlocked: boolean
}

export type HabitStore = {
  version: 2
  habits: Habit[]
  achievements: Achievement[]
}

export type Period = 'week' | 'month'

export const STORAGE_KEY = 'habit-tracker-data'

export const initialAchievements: Achievement[] = [
  { id: 1, title: 'Racha de oro', description: 'Mantén 7 días seguidos', unlocked: true },
  { id: 2, title: 'Ángel del hábito', description: 'Completa 3 hábitos en una semana', unlocked: false },
  { id: 3, title: 'Constancia total', description: 'Cumple tu meta de 5 días', unlocked: true },
]

const habitTemplates = [
  { id: 1, name: 'Meditación', description: '10 minutos', color: '#4f46e5', target: 7, daysAgo: [1, 2, 3, 4, 5] },
  { id: 2, name: 'Ejercicio', description: '30 minutos', color: '#f59e0b', target: 5, daysAgo: [1, 2, 4] },
  { id: 3, name: 'Leer', description: '20 minutos', color: '#10b981', target: 7, daysAgo: [1, 2, 3, 5, 6] },
]

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(date: Date, count: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() + count)
  return result
}

export function createInitialStore(today = new Date()): HabitStore {
  return {
    version: 2,
    habits: habitTemplates.map(({ daysAgo, ...habit }) => ({
      ...habit,
      completionDates: daysAgo.map((days) => toDateKey(addDays(today, -days))),
    })),
    achievements: initialAchievements,
  }
}

function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const date = fromDateKey(value)
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value
}

export function validateHabitStore(value: unknown): HabitStore {
  if (!value || typeof value !== 'object') {
    throw new Error('El respaldo no tiene un formato válido.')
  }

  const candidate = value as { version?: unknown; habits?: unknown; achievements?: unknown }
  if (candidate.version !== 2 || !Array.isArray(candidate.habits)) {
    throw new Error('El archivo no es un respaldo compatible de Rastreo de Hábitos.')
  }

  const ids = new Set<number>()
  const habits = candidate.habits.map((entry): Habit => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('El respaldo contiene un hábito inválido.')
    }

    const habit = entry as Record<string, unknown>
    if (
      typeof habit.id !== 'number'
      || !Number.isInteger(habit.id)
      || ids.has(habit.id)
      || typeof habit.name !== 'string'
      || !habit.name.trim()
      || typeof habit.description !== 'string'
      || typeof habit.color !== 'string'
      || typeof habit.target !== 'number'
      || !Number.isInteger(habit.target)
      || habit.target < 1
      || habit.target > 7
      || !Array.isArray(habit.completionDates)
      || !habit.completionDates.every(isValidDateKey)
    ) {
      throw new Error('El respaldo contiene datos de hábitos inválidos.')
    }
    ids.add(habit.id)

    return {
      id: habit.id,
      name: habit.name,
      description: habit.description,
      color: habit.color,
      target: habit.target,
      completionDates: [...new Set(habit.completionDates as string[])].sort(),
    }
  })

  const achievements = Array.isArray(candidate.achievements)
    ? candidate.achievements.filter((item): item is Achievement => {
      if (!item || typeof item !== 'object') return false
      const achievement = item as Record<string, unknown>
      return typeof achievement.id === 'number'
        && typeof achievement.title === 'string'
        && typeof achievement.description === 'string'
        && typeof achievement.unlocked === 'boolean'
    })
    : initialAchievements

  return { version: 2, habits, achievements }
}

export function getStreak(habit: Habit, today = new Date()): number {
  const completedDays = new Set(habit.completionDates)
  let date = toDateKey(today)
  if (!completedDays.has(date)) {
    date = toDateKey(addDays(today, -1))
  }

  let streak = 0
  while (completedDays.has(date)) {
    streak += 1
    date = toDateKey(addDays(fromDateKey(date), -1))
  }
  return streak
}

export function getPeriodRange(period: Period, referenceDate = new Date()): [Date, Date] {
  if (period === 'month') {
    return [
      new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1),
      new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0),
    ]
  }
  const dayOfWeek = (referenceDate.getDay() + 6) % 7
  const start = addDays(referenceDate, -dayOfWeek)
  return [start, addDays(start, 6)]
}

export function getHabitPeriodProgress(
  habit: Habit,
  period: Period,
  referenceDate = new Date(),
): { completed: number; goal: number; percent: number } {
  const [start, end] = getPeriodRange(period, referenceDate)
  const startKey = toDateKey(start)
  const endKey = toDateKey(end)
  const completed = new Set(habit.completionDates)
    .values()
  const completedInPeriod = Array.from(completed)
    .filter((date) => date >= startKey && date <= endKey).length
  const dayCount = end.getDate()
  const goal = period === 'week' ? habit.target : Math.max(1, Math.round((habit.target * dayCount) / 7))

  return {
    completed: completedInPeriod,
    goal,
    percent: Math.min(100, Math.round((completedInPeriod / goal) * 100)),
  }
}

export function isCompletedOn(habit: Habit, date: Date): boolean {
  return habit.completionDates.includes(toDateKey(date))
}

export function toggleCompletion(habit: Habit, date: Date): Habit {
  const dateKey = toDateKey(date)
  const completionDates = new Set(habit.completionDates)
  if (completionDates.has(dateKey)) {
    completionDates.delete(dateKey)
  } else {
    completionDates.add(dateKey)
  }
  return { ...habit, completionDates: [...completionDates].sort() }
}

export function getCalendarDays(month: Date): Array<Date | null> {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const days: Array<Date | null> = Array.from({ length: mondayOffset }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day))
  }
  while (days.length % 7 !== 0) days.push(null)
  return days
}

export function migrateLegacyStore(value: unknown): HabitStore {
  if (!value || typeof value !== 'object') {
    throw new Error('Los datos guardados no tienen un formato válido.')
  }
  const legacy = value as { habits?: unknown; achievements?: unknown }
  if (!Array.isArray(legacy.habits)) {
    throw new Error('No se encontraron hábitos en los datos guardados.')
  }

  const habits = legacy.habits.map((entry): Habit => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Los datos guardados contienen un hábito inválido.')
    }
    const habit = entry as Record<string, unknown>
    if (
      typeof habit.id !== 'number'
      || typeof habit.name !== 'string'
      || typeof habit.description !== 'string'
      || typeof habit.color !== 'string'
      || typeof habit.target !== 'number'
    ) {
      throw new Error('No se pudo migrar un hábito guardado.')
    }
    return {
      id: habit.id,
      name: habit.name,
      description: habit.description,
      color: habit.color,
      target: Math.min(7, Math.max(1, Math.round(habit.target))),
      completionDates: [],
    }
  })

  const achievements = Array.isArray(legacy.achievements)
    ? legacy.achievements.filter((item): item is Achievement => {
      if (!item || typeof item !== 'object') return false
      const achievement = item as Record<string, unknown>
      return typeof achievement.id === 'number'
        && typeof achievement.title === 'string'
        && typeof achievement.description === 'string'
        && typeof achievement.unlocked === 'boolean'
    })
    : initialAchievements

  return { version: 2, habits, achievements }
}
