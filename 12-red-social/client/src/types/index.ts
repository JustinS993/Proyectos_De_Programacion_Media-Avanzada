export interface User {
  id: string
  email: string
  username: string
  avatar?: string | null
  bio?: string | null
  createdAt: string
  updatedAt: string
}

export interface Post {
  id: string
  content: string
  imageUrl?: string | null
  videoUrl?: string | null
  userId: string
  user: User
  likes: any[]
  comments: any[]
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
  sender: User
  receiver: User
  read: boolean
  createdAt: string
}