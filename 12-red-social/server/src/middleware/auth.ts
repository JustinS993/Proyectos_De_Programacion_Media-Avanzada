import { Request, Response, NextFunction } from 'express'
import prisma from '../utils/db'
import { verifyAccessToken } from '../utils/tokens'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server authentication is not configured' })
    }
    const authorization = req.headers.authorization
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
    if (!token) return res.status(401).json({ error: 'No token provided' })

    const decoded = verifyAccessToken(token)
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } })

    if (!user) return res.status(401).json({ error: 'Invalid token' })

    req.userId = decoded.sub
    next()
  } catch {
    res.status(401).json({ error: 'Authentication failed' })
  }
}