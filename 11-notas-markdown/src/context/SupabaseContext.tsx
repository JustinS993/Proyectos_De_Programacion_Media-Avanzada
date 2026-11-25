import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Note, Folder } from '../types'

interface SupabaseContextType {
  user: User | null
  loading: boolean
  dataLoading: boolean
  dataError: string | null
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  notes: Note[]
  folders: Folder[]
  fetchNotes: () => Promise<void>
  fetchFolders: () => Promise<void>
  searchNotes: (query: string) => Promise<Note[]>
  createNote: (title: string, content: string, folderId?: string | null) => Promise<Note>
  updateNote: (id: string, title: string, content: string, folderId?: string | null) => Promise<Note>
  deleteNote: (id: string) => Promise<void>
  createFolder: (name: string) => Promise<Folder>
  deleteFolder: (id: string) => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)
let temporaryId = 0

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const notesRef = useRef(notes)
  const foldersRef = useRef(folders)
  const noteFetchRequest = useRef(0)
  const folderFetchRequest = useRef(0)
  const noteUpdateVersions = useRef(new Map<string, number>())
  const noteUpdateQueues = useRef(new Map<string, Promise<Note>>())

  const replaceNotes = useCallback((update: (current: Note[]) => Note[]) => {
    const next = update(notesRef.current)
    notesRef.current = next
    setNotes(next)
  }, [])

  const replaceFolders = useCallback((update: (current: Folder[]) => Folder[]) => {
    const next = update(foldersRef.current)
    foldersRef.current = next
    setFolders(next)
  }, [])

  const fetchNotes = useCallback(async () => {
    const requestId = ++noteFetchRequest.current
    setDataLoading(true)
    setDataError(null)
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      if (requestId === noteFetchRequest.current) {
        replaceNotes(() => data || [])
      }
    } catch (error) {
      if (requestId === noteFetchRequest.current) setDataError(getErrorMessage(error))
      throw error
    } finally {
      if (requestId === noteFetchRequest.current) setDataLoading(false)
    }
  }, [replaceNotes])

  const fetchFolders = useCallback(async () => {
    const requestId = ++folderFetchRequest.current
    setDataError(null)
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      if (requestId === folderFetchRequest.current) {
        replaceFolders(() => data || [])
      }
    } catch (error) {
      if (requestId === folderFetchRequest.current) setDataError(getErrorMessage(error))
      throw error
    }
  }, [replaceFolders])

  const searchNotes = useCallback(async (query: string): Promise<Note[]> => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return notesRef.current

    const pattern = `%${escapeLikePattern(trimmedQuery)}%`
    const [titleResult, contentResult] = await Promise.all([
      supabase.from('notes').select('*').ilike('title', pattern),
      supabase.from('notes').select('*').ilike('content', pattern),
    ])
    if (titleResult.error) throw titleResult.error
    if (contentResult.error) throw contentResult.error

    const matches = new Map<string, Note>()
    for (const note of [...(titleResult.data || []), ...(contentResult.data || [])]) {
      matches.set(note.id, note)
    }
    return [...matches.values()].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
  }, [])

  useEffect(() => {
    let active = true
    let currentUserId: string | null | undefined

    const applySession = (session: { user: User } | null) => {
      if (!active) return
      const nextUser = session?.user || null
      const nextUserId = nextUser?.id || null
      if (currentUserId === nextUserId) return

      currentUserId = nextUserId
      setUser(nextUser)
      setLoading(false)
      if (!nextUser) {
        noteFetchRequest.current += 1
        folderFetchRequest.current += 1
        replaceNotes(() => [])
        replaceFolders(() => [])
        setDataLoading(false)
        setDataError(null)
        return
      }

      setTimeout(() => {
        if (!active || currentUserId !== nextUserId) return
        void Promise.all([fetchNotes(), fetchFolders()]).catch(() => {
          // The individual fetch functions expose their errors in the context.
        })
      }, 0)
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error
      applySession(data.session)
    }).catch((error: unknown) => {
      if (!active) return
      setDataError(getErrorMessage(error))
      setLoading(false)
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [fetchFolders, fetchNotes, replaceFolders, replaceNotes])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const createNote = async (title: string, content: string, folderId: string | null = null) => {
    if (!user) throw new Error('Debes iniciar sesión para crear una nota.')
    const now = new Date().toISOString()
    const optimisticNote: Note = {
      id: `pending-${Date.now()}-${++temporaryId}`,
      title,
      content,
      folder_id: folderId,
      user_id: user.id,
      created_at: now,
      updated_at: now,
    }
    replaceNotes((current) => [optimisticNote, ...current])
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({ title, content, folder_id: folderId, user_id: user.id })
        .select('*')
        .single()
      if (error) throw error
      replaceNotes((current) => [data, ...current.filter((note) => note.id !== optimisticNote.id)])
      return data
    } catch (error) {
      replaceNotes((current) => current.filter((note) => note.id !== optimisticNote.id))
      throw error
    }
  }

  const updateNote = async (id: string, title: string, content: string, folderId: string | null = null) => {
    const previous = notesRef.current.find((note) => note.id === id)
    if (!previous) throw new Error('No se encontró la nota que quieres guardar.')

    const version = (noteUpdateVersions.current.get(id) || 0) + 1
    noteUpdateVersions.current.set(id, version)
    const optimisticNote: Note = {
      ...previous,
      title,
      content,
      folder_id: folderId,
      updated_at: new Date().toISOString(),
    }
    replaceNotes((current) => current.map((note) => note.id === id ? optimisticNote : note))

    const previousWrite = noteUpdateQueues.current.get(id) || Promise.resolve(previous)
    const write = previousWrite.catch(() => previous).then(async () => {
      const { data, error } = await supabase
        .from('notes')
        .update({ title, content, folder_id: folderId, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      if (noteUpdateVersions.current.get(id) === version) {
        replaceNotes((current) => current.map((note) => note.id === id ? data : note))
      }
      return data
    }).catch(async (error: unknown) => {
      if (noteUpdateVersions.current.get(id) === version) {
        const { data } = await supabase.from('notes').select('*').eq('id', id).maybeSingle()
        replaceNotes((current) => data
          ? current.map((note) => note.id === id ? data : note)
          : current.map((note) => note.id === id ? previous : note))
      }
      throw error
    }).finally(() => {
      if (noteUpdateQueues.current.get(id) === write) noteUpdateQueues.current.delete(id)
    })
    noteUpdateQueues.current.set(id, write)
    return write
  }

  const deleteNote = async (id: string) => {
    const previous = notesRef.current.find((note) => note.id === id)
    noteUpdateVersions.current.set(id, (noteUpdateVersions.current.get(id) || 0) + 1)
    replaceNotes((current) => current.filter((note) => note.id !== id))
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw error
    } catch (error) {
      if (previous) replaceNotes((current) => [previous, ...current])
      throw error
    }
  }

  const createFolder = async (name: string) => {
    if (!user) throw new Error('Debes iniciar sesión para crear una carpeta.')
    const { data, error } = await supabase
      .from('folders')
      .insert({ name, user_id: user.id })
      .select('*')
      .single()
    if (error) throw error
    replaceFolders((current) => [data, ...current])
    return data
  }

  const deleteFolder = async (id: string) => {
    const previousFolder = foldersRef.current.find((folder) => folder.id === id)
    const previousNotes = notesRef.current.filter((note) => note.folder_id === id)
    replaceFolders((current) => current.filter((folder) => folder.id !== id))
    replaceNotes((current) => current.map((note) => note.folder_id === id
      ? { ...note, folder_id: null }
      : note))
    try {
      const { error } = await supabase.from('folders').delete().eq('id', id)
      if (error) throw error
    } catch (error) {
      if (previousFolder) replaceFolders((current) => [previousFolder, ...current])
      replaceNotes((current) => current.map((note) => {
        const previousNote = previousNotes.find((item) => item.id === note.id)
        return previousNote ? { ...note, folder_id: previousNote.folder_id } : note
      }))
      throw error
    }
  }

  return (
    <SupabaseContext.Provider
      value={{
        user,
        loading,
        dataLoading,
        dataError,
        signUp,
        signIn,
        signOut,
        notes,
        folders,
        fetchNotes,
        fetchFolders,
        searchNotes,
        createNote,
        updateNote,
        deleteNote,
        createFolder,
        deleteFolder,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) throw new Error('useSupabase must be used within a SupabaseProvider')
  return context
}
