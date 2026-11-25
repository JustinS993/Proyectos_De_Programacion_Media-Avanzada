import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSupabase } from '../context/SupabaseContext'
import type { Note } from '../types'

interface NoteDraft {
  noteId: string | null
  title: string
  content: string
  folderId: string | null
  isNew: boolean
  isEditing: boolean
}

function draftSignature(draft: NoteDraft): string {
  return JSON.stringify([draft.title, draft.content, draft.folderId])
}

export const HomeScreen: React.FC = () => {
  const {
    user,
    signOut,
    notes,
    folders,
    dataLoading,
    dataError,
    fetchNotes,
    fetchFolders,
    searchNotes,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    deleteFolder,
  } = useSupabase()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Note[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isNewNote, setIsNewNote] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editFolderId, setEditFolderId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle')
  const [editorError, setEditorError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveInFlight = useRef<Promise<boolean> | null>(null)
  const lastSavedSignature = useRef<string | null>(null)
  const draftRef = useRef<NoteDraft>({
    noteId: null,
    title: '',
    content: '',
    folderId: null,
    isNew: false,
    isEditing: false,
  })
  const saveDraftRef = useRef<() => Promise<boolean>>(async () => true)

  const currentDraft: NoteDraft = {
    noteId: selectedNote?.id || null,
    title: editTitle,
    content: editContent,
    folderId: editFolderId,
    isNew: isNewNote,
    isEditing,
  }

  useEffect(() => {
    draftRef.current = currentDraft
  }, [selectedNote?.id, editTitle, editContent, editFolderId, isNewNote, isEditing])

  useEffect(() => {
    let active = true
    const query = searchQuery.trim()
    if (!query) {
      setSearchResults(null)
      setSearchError(null)
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    setSearchError(null)
    setSearchResults(null)
    const timer = setTimeout(() => {
      void searchNotes(query)
        .then((results) => {
          if (active) setSearchResults(results)
        })
        .catch((error: unknown) => {
          if (active) {
            setSearchError(error instanceof Error ? error.message : 'No se pudieron buscar las notas.')
          }
        })
        .finally(() => {
          if (active) setSearchLoading(false)
        })
    }, 350)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [searchQuery, searchNotes])

  const updateSearchResults = useCallback((note: Note) => {
    const query = searchQuery.trim().toLocaleLowerCase()
    if (!query) return
    const matches = `${note.title}\n${note.content}`.toLocaleLowerCase().includes(query)
    setSearchResults((current) => {
      if (!current) return current
      const withoutNote = current.filter((item) => item.id !== note.id)
      if (!matches) return withoutNote
      return [note, ...withoutNote].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
    })
  }, [searchQuery])

  const performSave = useCallback(async (): Promise<boolean> => {
    if (saveInFlight.current) {
      const succeeded = await saveInFlight.current
      if (!succeeded) return false
      const latest = draftRef.current
      if (!latest.isEditing || draftSignature(latest) === lastSavedSignature.current) return true
      return performSave()
    }

    const draft = draftRef.current
    const signature = draftSignature(draft)
    if (!draft.isEditing || (!draft.isNew && !draft.noteId) || signature === lastSavedSignature.current) {
      return true
    }

    setSaveStatus('saving')
    setEditorError(null)
    const operation = (async () => {
      try {
        const savedNote = draft.isNew
          ? await createNote(draft.title.trim() || 'Nueva Nota', draft.content, draft.folderId)
          : await updateNote(draft.noteId!, draft.title.trim() || 'Sin título', draft.content, draft.folderId)

        lastSavedSignature.current = signature
        if (draft.isNew) {
          draftRef.current = {
            ...draftRef.current,
            noteId: savedNote.id,
            isNew: false,
          }
          setSelectedNote(savedNote)
          setIsNewNote(false)
        } else {
          setSelectedNote(savedNote)
        }
        updateSearchResults(savedNote)
        setSaveStatus(draftSignature(draftRef.current) === signature ? 'saved' : 'pending')
        return true
      } catch (error) {
        setSaveStatus('error')
        setEditorError(error instanceof Error ? error.message : 'No se pudo guardar la nota.')
        return false
      }
    })()
    saveInFlight.current = operation
    const succeeded = await operation
    if (saveInFlight.current === operation) saveInFlight.current = null

    const latest = draftRef.current
    if (succeeded && latest.isEditing && draftSignature(latest) !== lastSavedSignature.current) {
      return performSave()
    }
    return succeeded
  }, [createNote, updateNote, updateSearchResults])

  useEffect(() => {
    saveDraftRef.current = performSave
  }, [performSave])

  useEffect(() => {
    if (!isEditing || (!isNewNote && !selectedNote)) return
    const signature = draftSignature(currentDraft)
    if (signature === lastSavedSignature.current) return
    setSaveStatus('pending')
    setEditorError(null)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      void saveDraftRef.current()
    }, 700)

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
    }
  }, [isEditing, isNewNote, selectedNote?.id, editTitle, editContent, editFolderId])

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    void saveDraftRef.current()
  }, [])

  const flushAutosave = async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    return saveDraftRef.current()
  }

  const handleNewNote = async () => {
    if (!await flushAutosave()) return
    const now = new Date().toISOString()
    const newNote: Note = {
      id: '',
      title: 'Nueva Nota',
      content: '',
      folder_id: selectedFolderId,
      user_id: user?.id || '',
      created_at: now,
      updated_at: now,
    }
    lastSavedSignature.current = null
    setSelectedNote(newNote)
    setEditTitle(newNote.title)
    setEditContent(newNote.content)
    setEditFolderId(newNote.folder_id)
    setSaveStatus('pending')
    setEditorError(null)
    setIsEditing(true)
    setIsNewNote(true)
  }

  const handleSaveNote = async () => {
    if (!await flushAutosave()) return
    setIsEditing(false)
    setIsNewNote(false)
    setSaveStatus('idle')
    setEditorError(null)
  }

  const handleSelectNote = async (note: Note) => {
    if (!await flushAutosave()) return
    setSelectedNote(note)
    setIsEditing(false)
    setIsNewNote(false)
    setSaveStatus('idle')
    setEditorError(null)
  }

  const handleDeleteNote = async () => {
    if (!selectedNote || isNewNote) return
    if (!window.confirm('¿Seguro que quieres borrar esta nota?')) return
    if (!await flushAutosave()) return
    try {
      await deleteNote(selectedNote.id)
      setSearchResults((current) => current?.filter((note) => note.id !== selectedNote.id) ?? null)
      setSelectedNote(null)
      setIsEditing(false)
      setEditorError(null)
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : 'No se pudo borrar la nota.')
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setActionError(null)
    try {
      await createFolder(newFolderName.trim())
      setNewFolderName('')
      setIsCreatingFolder(false)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo crear la carpeta.')
    }
  }

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    const noteCount = notes.filter((note) => note.folder_id === folderId).length
    const detail = noteCount
      ? ` Las ${noteCount} notas de esta carpeta se conservarán sin carpeta.`
      : ''
    if (!window.confirm(`¿Eliminar la carpeta "${folderName}"?${detail}`)) return
    if (!await flushAutosave()) return
    setActionError(null)
    try {
      await deleteFolder(folderId)
      if (selectedFolderId === folderId) setSelectedFolderId(null)
      setSearchResults((current) => current?.map((note) => (
        note.folder_id === folderId ? { ...note, folder_id: null } : note
      )) ?? null)
      setSelectedNote((current) => current?.folder_id === folderId
        ? { ...current, folder_id: null }
        : current)
      if (editFolderId === folderId) setEditFolderId(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo eliminar la carpeta.')
    }
  }

  const retryLoad = async () => {
    await Promise.allSettled([fetchNotes(), fetchFolders()])
  }

  const visibleNotes = (searchResults ?? notes).filter((note) => (
    selectedFolderId ? note.folder_id === selectedFolderId : true
  ))

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Notas</h1>
            <button
              onClick={signOut}
              className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 font-medium"
            >
              Cerrar Sesión
            </button>
          </div>
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Buscar notas..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</div>
          </div>
          <button
            onClick={() => void handleNewNote()}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            + Nueva Nota
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Carpetas</h3>
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="text-purple-600 hover:text-purple-700"
                aria-label="Crear carpeta"
              >
                +
              </button>
            </div>
            {isCreatingFolder && (
              <div className="space-y-2 mb-2">
                <input
                  autoFocus
                  type="text"
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') void handleCreateFolder() }}
                  onBlur={() => { if (!newFolderName) setIsCreatingFolder(false) }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Nombre de carpeta"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleCreateFolder()}
                    className="flex-1 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setIsCreatingFolder(false)}
                    className="flex-1 py-1 text-sm text-gray-600 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <button
                onClick={() => setSelectedFolderId(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedFolderId ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                📁 Todas las notas
              </button>
              {folders.map((folder) => (
                <div key={folder.id} className="group flex items-center justify-between">
                  <button
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFolderId === folder.id ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    📂 {folder.name}
                  </button>
                  <button
                    onClick={() => void handleDeleteFolder(folder.id, folder.name)}
                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Eliminar carpeta ${folder.name}`}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">Notas</h3>
            {searchLoading && <p className="text-sm text-gray-500 px-3 py-2">Buscando...</p>}
            {searchError && <p role="alert" className="text-sm text-red-600 px-3 py-2">{searchError}</p>}
            {dataLoading && notes.length === 0 && <p className="text-sm text-gray-500 px-3 py-2">Cargando notas...</p>}
            {dataError && (
              <div role="alert" className="text-sm text-red-600 px-3 py-2">
                <p>{dataError}</p>
                <button onClick={() => void retryLoad()} className="underline mt-1">Reintentar</button>
              </div>
            )}
            {!searchLoading && !searchError && !dataLoading && visibleNotes.length === 0 && (
              <p className="text-sm text-gray-500 px-3 py-2">
                {searchQuery.trim() ? 'No se encontraron notas.' : 'Todavía no hay notas.'}
              </p>
            )}
            <div className="space-y-2">
              {visibleNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => void handleSelectNote(note)}
                  className={`w-full text-left p-3 rounded-lg cursor-pointer transition-colors ${selectedNote?.id === note.id ? 'bg-purple-100 border border-purple-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  <h4 className="font-medium text-gray-800 truncate">{note.title}</h4>
                  <p className="text-xs text-gray-500 truncate mt-1">{note.content}</p>
                </button>
              ))}
            </div>
          </div>
          {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {!selectedNote ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-medium">Selecciona una nota o crea una nueva</h2>
          </div>
        ) : isEditing ? (
          <div className="flex-1 flex flex-col p-8">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => void handleSaveNote()}
                className="text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                ← Guardar y cerrar
              </button>
              <div className="flex items-center gap-3">
                <span role={saveStatus === 'error' ? 'alert' : 'status'} className={`text-sm ${saveStatus === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
                  {saveStatus === 'saving' && 'Guardando...'}
                  {saveStatus === 'pending' && 'Cambios pendientes'}
                  {saveStatus === 'saved' && 'Guardado'}
                  {saveStatus === 'error' && 'Error al guardar'}
                </span>
                <select
                  value={editFolderId || ''}
                  onChange={(event) => setEditFolderId(event.target.value || null)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="">Sin carpeta</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => void handleSaveNote()}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:opacity-90"
                >
                  💾 Guardar y cerrar
                </button>
                {!isNewNote && (
                  <button
                    onClick={() => void handleDeleteNote()}
                    className="px-4 py-2 bg-red-100 text-red-600 font-medium rounded-lg hover:bg-red-200"
                    aria-label="Eliminar nota"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
            {editorError && (
              <div role="alert" className="mb-4 text-sm text-red-700 bg-red-50 p-3 rounded">
                {editorError}
                <button onClick={() => void flushAutosave()} className="ml-3 underline">Reintentar</button>
              </div>
            )}
            <input
              autoFocus
              type="text"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="text-3xl font-bold text-gray-800 mb-4 bg-transparent border-none focus:ring-0 outline-none"
              placeholder="Título de la nota"
            />
            <textarea
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              className="flex-1 w-full text-gray-700 bg-transparent border-none focus:ring-0 outline-none resize-none"
              placeholder="Escribe tu nota en Markdown..."
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-8">
            <div className="flex items-center justify-between mb-6">
              <div />
              <button
                onClick={() => {
                  setEditTitle(selectedNote.title)
                  setEditContent(selectedNote.content)
                  setEditFolderId(selectedNote.folder_id)
                  lastSavedSignature.current = draftSignature({
                    noteId: selectedNote.id,
                    title: selectedNote.title,
                    content: selectedNote.content,
                    folderId: selectedNote.folder_id,
                    isNew: false,
                    isEditing: true,
                  })
                  setSaveStatus('saved')
                  setEditorError(null)
                  setIsEditing(true)
                  setIsNewNote(false)
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:opacity-90"
              >
                ✏️ Editar
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-8">{selectedNote.title}</h1>
            <div className="prose prose-lg max-w-none flex-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedNote.content}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
