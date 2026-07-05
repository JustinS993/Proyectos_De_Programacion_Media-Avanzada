import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../utils/db'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'No token provided' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })

    if (!user) return res.status(401).json({ error: 'Invalid token' })

    req.userId = decoded.userId
    next()
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' })
  }
}