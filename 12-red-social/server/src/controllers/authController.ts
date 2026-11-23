import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import prisma from '../utils/db'
import {
  createAccessToken,
  createRefreshToken,
  createRefreshTokenFamilyId,
  getClearRefreshCookieOptions,
  getRefreshCookieOptions,
  getRefreshTokenExpiry,
  hashRefreshToken,
  REFRESH_COOKIE_NAME
} from '../utils/tokens'
import { loginSchema, registerSchema } from '../validation/authSchemas'

const publicUser = {
  id: true,
  email: true,
  username: true,
  avatar: true,
  bio: true
}

async function createSession(userId: string, res: Response): Promise<string> {
  const accessToken = createAccessToken(userId)
  const refreshToken = createRefreshToken()
  const familyId = createRefreshTokenFamilyId()
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      familyId,
      userId,
      expiresAt: getRefreshTokenExpiry()
    }
  })
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions())
  return accessToken
}

export const register = async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid registration data', details: parsed.error.flatten().fieldErrors })
  }

  const { email, username, password } = parsed.data
  try {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true }
    })
    if (existingUser) {
      return res.status(409).json({ error: 'Email or username already exists' })
    }

    const user = await prisma.user.create({
      data: { email, username, password: await bcrypt.hash(password, 10) },
      select: publicUser
    })
    const token = await createSession(user.id, res)
    return res.status(201).json({ user, token })
  } catch (error) {
    console.error('Registration failed:', error)
    return res.status(500).json({ error: 'Registration failed' })
  }
}

export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid login data' })
  }

  const { email, password } = parsed.data
  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email }, { username: email }] }
    })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const { password: _password, ...userData } = user
    const token = await createSession(user.id, res)
    return res.json({ user: userData, token })
  } catch (error) {
    console.error('Login failed:', error)
    return res.status(500).json({ error: 'Login failed' })
  }
}

export const refresh = async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME]
  if (typeof rawToken !== 'string' || rawToken.length < 32) {
    return res.status(401).json({ error: 'Refresh token required' })
  }

  try {
    const now = new Date()
    await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: now } }
    })
    const oldToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
      include: { user: { select: publicUser } }
    })
    if (!oldToken || oldToken.expiresAt <= now) {
      res.clearCookie(REFRESH_COOKIE_NAME, getClearRefreshCookieOptions())
      return res.status(401).json({ error: 'Invalid refresh token' })
    }
    if (oldToken.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { familyId: oldToken.familyId, revokedAt: null },
        data: { revokedAt: now }
      })
      return res.status(401).json({ error: 'Refresh token has already been used' })
    }

    const accessToken = createAccessToken(oldToken.userId)
    const nextRawToken = createRefreshToken()
    const nextTokenHash = hashRefreshToken(nextRawToken)
    const rotated = await prisma.$transaction(async (transaction) => {
      const revokeResult = await transaction.refreshToken.updateMany({
        where: { id: oldToken.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now }
      })
      if (revokeResult.count !== 1) return false

      await transaction.refreshToken.create({
        data: {
          tokenHash: nextTokenHash,
          familyId: oldToken.familyId,
          userId: oldToken.userId,
          expiresAt: getRefreshTokenExpiry()
        }
      })
      return true
    })

    if (!rotated) {
      return res.status(401).json({ error: 'Refresh token has already been used' })
    }

    res.cookie(REFRESH_COOKIE_NAME, nextRawToken, getRefreshCookieOptions())
    return res.json({
      user: oldToken.user,
      token: accessToken
    })
  } catch (error) {
    console.error('Token refresh failed:', error)
    return res.status(500).json({ error: 'Token refresh failed' })
  }
}

export const logout = async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME]
  try {
    if (typeof rawToken === 'string') {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
        data: { revokedAt: new Date() }
      })
    }
    res.clearCookie(REFRESH_COOKIE_NAME, getClearRefreshCookieOptions())
    return res.status(204).end()
  } catch (error) {
    console.error('Logout failed:', error)
    return res.status(500).json({ error: 'Logout failed' })
  }
}
