import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import http from 'http'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { Server, Socket } from 'socket.io'
import prisma from './utils/db'
import redisClient from './utils/redis'
import { getJwtSecret, getRefreshCookieOptions, verifyAccessToken } from './utils/tokens'
import { chatMessageSchema } from './validation/chatSchemas'
import authRoutes from './routes/authRoutes'
import postRoutes from './routes/postRoutes'
import userRoutes from './routes/userRoutes'

const PORT = process.env.PORT || 3001
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
const CHAT_WINDOW_MS = 10_000
const CHAT_MAX_MESSAGES_PER_WINDOW = 20

type ChatSocket = Socket & { data: { userId: string } }

export function createApp() {
  const app = express()
  app.use(helmet())
  app.use(cors({ origin: corsOrigin, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use('/uploads', express.static('uploads'))

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false
  })

  app.use('/api/auth', authLimiter)
  app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('origin')
    if (['/refresh', '/logout'].includes(req.path) && origin && origin !== corsOrigin) {
      return res.status(403).json({ error: 'Origin not allowed' })
    }
    return next()
  })
  app.use('/api/auth', authRoutes)
  app.use('/api/posts', postRoutes)
  app.use('/api/users', userRoutes)

  return app
}

export function createSocketServer(server: http.Server) {
  const io = new Server(server, {
    cors: { origin: corsOrigin, credentials: true }
  })
  const messageWindows = new Map<string, { startedAt: number; count: number }>()

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (typeof token !== 'string') return next(new Error('Authentication required'))

    try {
      const { sub } = verifyAccessToken(token)
      const user = await prisma.user.findUnique({
        where: { id: sub },
        select: { id: true }
      })
      if (!user) return next(new Error('Invalid authentication token'))
      socket.data.userId = sub
      next()
    } catch {
      next(new Error('Invalid authentication token'))
    }
  })

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as ChatSocket
    const userId = socket.data.userId
    socket.join(userId)

    socket.on('send_message', async (data: unknown, acknowledge?: (result: unknown) => void) => {
      const now = Date.now()
      const currentWindow = messageWindows.get(userId)
      const window = !currentWindow || now - currentWindow.startedAt >= CHAT_WINDOW_MS
        ? { startedAt: now, count: 0 }
        : currentWindow
      if (window !== currentWindow) {
        messageWindows.set(userId, window)
        const cleanupTimer = setTimeout(() => {
          if (messageWindows.get(userId) === window) messageWindows.delete(userId)
        }, CHAT_WINDOW_MS)
        cleanupTimer.unref()
      }
      if (window.count >= CHAT_MAX_MESSAGES_PER_WINDOW) {
        acknowledge?.({ error: 'Rate limit exceeded' })
        return
      }

      window.count += 1
      messageWindows.set(userId, window)
      const parsed = chatMessageSchema.safeParse(data)
      if (!parsed.success) {
        acknowledge?.({ error: 'Invalid message data' })
        return
      }
      if (parsed.data.receiverId === userId) {
        acknowledge?.({ error: 'Cannot send a message to yourself' })
        return
      }

      try {
        const receiver = await prisma.user.findUnique({
          where: { id: parsed.data.receiverId },
          select: { id: true }
        })
        if (!receiver) {
          acknowledge?.({ error: 'Recipient not found' })
          return
        }

        const message = await prisma.message.create({
          data: {
            content: parsed.data.content,
            senderId: userId,
            receiverId: receiver.id
          },
          include: {
            sender: { select: { id: true, username: true, avatar: true } },
            receiver: { select: { id: true, username: true, avatar: true } }
          }
        })
        io.to(receiver.id).emit('new_message', message)
        acknowledge?.({ message })
      } catch (error) {
        console.error('Socket message failed:', error)
        acknowledge?.({ error: 'Message could not be sent' })
      }
    })
  })

  return io
}

export const app = createApp()

export async function startServer() {
  const server = http.createServer(app)
  const io = createSocketServer(server)
  try {
    getJwtSecret()
    getRefreshCookieOptions()
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
    io.close()
    server.close()
    console.error('Failed to start server:', error)
    process.exitCode = 1
  }
}

if (require.main === module) {
  void startServer()
}
