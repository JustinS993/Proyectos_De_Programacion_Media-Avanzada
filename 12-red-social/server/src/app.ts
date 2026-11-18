import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import prisma from './utils/db'
import redisClient from './utils/redis'
import authRoutes from './routes/authRoutes'
import postRoutes from './routes/postRoutes'
import userRoutes from './routes/userRoutes'

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3001
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'

app.use(helmet())
app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static('uploads'))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false
})

app.use('/api/auth', authLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/users', userRoutes)

const io = new Server(server, {
  cors: { origin: corsOrigin }
})

io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined
  if (!token || !process.env.JWT_SECRET) return next(new Error('Authentication required'))

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string }
    socket.data.userId = decoded.userId
    next()
  } catch {
    next(new Error('Invalid authentication token'))
  }
})

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)
  const userId = socket.data.userId as string
  socket.join(userId)

  socket.on('send_message', async (data: { receiverId: string; content: string }) => {
    if (
      typeof data?.receiverId !== 'string'
      || typeof data?.content !== 'string'
      || data.content.trim().length < 1
      || data.content.length > 2000
    ) return

    const receiver = await prisma.user.findUnique({ where: { id: data.receiverId } })
    if (!receiver) return

    const message = await prisma.message.create({
      data: {
        content: data.content.trim(),
        senderId: userId,
        receiverId: data.receiverId
      },
      include: { sender: true, receiver: true }
    })
    io.to(data.receiverId).emit('new_message', message)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

const startServer = async () => {
  try {
    await prisma.$connect()
    try {
      await redisClient.connect()
    } catch (error) {
      console.warn('Redis unavailable; continuing without Redis:', error)
    }
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
  }
}

startServer()