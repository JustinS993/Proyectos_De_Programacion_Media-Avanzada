import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Note, Folder } from '../types'

interface SupabaseContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  notes: Note[]
  folders: Folder[]
  fetchNotes: () => Promise<void>
  fetchFolders: () => Promise<void>
  createNote: (title: string, content: string, folderId?: string | null) => Promise<void>
  updateNote: (id: string, title: string, content: string, folderId?: string | null) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  createFolder: (name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Note[]>([])
  const [folders, setFolders] = useState<Folder[]>([])

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null)
      setLoading(false)
      if (session?.user) {
        await Promise.all([fetchNotes(), fetchFolders()])
      }
    })

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
      if (session?.user) {
        await Promise.all([fetchNotes(), fetchFolders()])
      }
    }

    checkSession()
    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

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

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) throw error
    setNotes(data || [])
  }

  const fetchFolders = async () => {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    setFolders(data || [])
  }

  const createNote = async (title: string, content: string, folderId: string | null = null) => {
    const { error } = await supabase
      .from('notes')
      .insert({ title, content, folder_id: folderId })
    if (error) throw error
    await fetchNotes()
  }

  const updateNote = async (id: string, title: string, content: string, folderId: string | null = null) => {
    const { error } = await supabase
      .from('notes')
      .update({ title, content, folder_id: folderId, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    await fetchNotes()
  }

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) throw error
    await fetchNotes()
  }

  const createFolder = async (name: string) => {
    const { error } = await supabase.from('folders').insert({ name })
    if (error) throw error
    await fetchFolders()
  }

  const deleteFolder = async (id: string) => {
    const { error: notesError } = await supabase
      .from('notes')
      .update({ folder_id: null })
      .eq('folder_id', id)
    if (notesError) throw notesError

    const { error } = await supabase.from('folders').delete().eq('id', id)
    if (error) throw error
    await fetchFolders()
  }

  return (
    <SupabaseContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
        notes,
        folders,
        fetchNotes,
        fetchFolders,
        createNote,
        updateNote,
        deleteNote,
        createFolder,
        deleteFolder
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
