import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import prisma from './utils/db'
import redisClient from './utils/redis'
import authRoutes from './routes/authRoutes'
import postRoutes from './routes/postRoutes'
import userRoutes from './routes/userRoutes'

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.CORS_ORIGIN }))
app.use(express.json())
app.use('/uploads', express.static('uploads'))

app.use('/api/auth', authRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/users', userRoutes)

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN }
})

const activeUsers = new Map<string, string>()

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join', async (userId: string) => {
    activeUsers.set(userId, socket.id)
    socket.join(userId)
  })

  socket.on('send_message', async (data: { senderId: string; receiverId: string; content: string }) => {
    const message = await prisma.message.create({
      data: {
        content: data.content,
        senderId: data.senderId,
        receiverId: data.receiverId
      },
      include: { sender: true, receiver: true }
    })
    io.to(data.receiverId).emit('new_message', message)
  })

  socket.on('disconnect', () => {
    for (const [userId, socketId] of activeUsers) {
      if (socketId === socket.id) {
        activeUsers.delete(userId)
        break
      }
    }
  })
})

const startServer = async () => {
  try {
    await prisma.$connect()
    await redisClient.connect()
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
  }
}

startServer()