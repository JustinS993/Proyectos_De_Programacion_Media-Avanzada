import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSupabase } from '../context/SupabaseContext'
import type { Note } from '../types'

export const HomeScreen: React.FC = () => {
  const {
    user,
    signOut,
    notes,
    folders,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    deleteFolder
  } = useSupabase()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editFolderId, setEditFolderId] = useState<string | null>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFolder = selectedFolderId ? note.folder_id === selectedFolderId : true
    return matchesSearch && matchesFolder
  })

  const handleNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Nueva Nota',
      content: '',
      folder_id: selectedFolderId,
      user_id: user?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setSelectedNote(newNote)
    setEditTitle(newNote.title)
    setEditContent(newNote.content)
    setEditFolderId(newNote.folder_id)
    setIsEditing(true)
  }

  const handleSaveNote = async () => {
    if (!selectedNote) return
    try {
      if (selectedNote.id.startsWith(Date.now().toString().slice(0, -3))) {
        await createNote(editTitle, editContent, editFolderId)
      } else {
        await updateNote(selectedNote.id, editTitle, editContent, editFolderId)
      }
      setIsEditing(false)
    } catch (err) {
      console.error('Error guardando nota:', err)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await createFolder(newFolderName.trim())
      setNewFolderName('')
      setIsCreatingFolder(false)
    } catch (err) {
      console.error('Error creando carpeta:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</div>
          </div>
          <button
            onClick={handleNewNote}
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
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder() }}
                  onBlur={() => !newFolderName && setIsCreatingFolder(false)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Nombre de carpeta"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateFolder}
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
              {folders.map(folder => (
                <div key={folder.id} className="group flex items-center justify-between">
                  <button
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFolderId === folder.id ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    📂 {folder.name}
                  </button>
                  <button
                    onClick={() => deleteFolder(folder.id)}
                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">Notas</h3>
            <div className="space-y-2">
              {filteredNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => { setSelectedNote(note); setIsEditing(false) }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedNote?.id === note.id ? 'bg-purple-100 border border-purple-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  <h4 className="font-medium text-gray-800 truncate">{note.title}</h4>
                  <p className="text-xs text-gray-500 truncate mt-1">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Editor / Vista */}
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
                onClick={() => setIsEditing(false)}
                className="text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                ← Cancelar
              </button>
              <div className="flex gap-3">
                <select
                  value={editFolderId || ''}
                  onChange={(e) => setEditFolderId(e.target.value || null)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="">Sin carpeta</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleSaveNote}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:opacity-90"
                >
                  💾 Guardar
                </button>
                <button
                  onClick={() => { if (confirm('¿Seguro que quieres borrar esta nota?')) deleteNote(selectedNote.id); setSelectedNote(null) }}
                  className="px-4 py-2 bg-red-100 text-red-600 font-medium rounded-lg hover:bg-red-200"
                >
                  🗑️
                </button>
              </div>
            </div>
            <input
              autoFocus
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-3xl font-bold text-gray-800 mb-4 bg-transparent border-none focus:ring-0 outline-none"
              placeholder="Título de la nota"
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 w-full text-gray-700 bg-transparent border-none focus:ring-0 outline-none resize-none"
              placeholder="Escribe tu nota en Markdown..."
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-8">
            <div className="flex items-center justify-between mb-6">
              <div />
              <button
                onClick={() => { setEditTitle(selectedNote.title); setEditContent(selectedNote.content); setEditFolderId(selectedNote.folder_id); setIsEditing(true) }}
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
