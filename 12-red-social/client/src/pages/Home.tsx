import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { Post } from '../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export const Home: React.FC = () => {
  const { user, logout } = useAuth()
  const [content, setContent] = useState('')
  const queryClient = useQueryClient()

  const { data: posts = [] } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.get('/posts/feed')
  })

  const createPost = useMutation({
    mutationFn: (data: { content: string }) => api.post('/posts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      setContent('')
    }
  })

  const toggleLike = useMutation({
    mutationFn: (postId: string) => api.post(`/posts/${postId}/like`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim()) {
      createPost.mutate({ content })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">RedSocial</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">@{user?.username}</span>
            <button onClick={logout} className="text-gray-600 hover:text-red-600 font-medium">Cerrar Sesión</button>
          </div>
        </div>
      </nav>
      
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="¿Qué estás pensando?"
              className="w-full p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 outline-none"
              rows={3}
            />
            <button
              type="submit"
              disabled={!content.trim() || createPost.isPending}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Publicar
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {posts.map((post: Post) => (
            <div key={post.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-bold">
                  {post.user.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">@{post.user.username}</p>
                  <p className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-gray-800 mb-4 prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
              </div>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => toggleLike.mutate(post.id)}
                  className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
                >
                  <span>{post.likes.length} ❤️</span>
                </button>
                <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
                  <span>{post.comments.length} 💬</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}