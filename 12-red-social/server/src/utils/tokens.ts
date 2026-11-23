import { createHash, randomBytes, randomUUID } from 'crypto'
import jwt, { JwtPayload } from 'jsonwebtoken'

const ACCESS_TOKEN_TTL = '15m'
const DEFAULT_REFRESH_TOKEN_DAYS = 30

export const REFRESH_COOKIE_NAME = 'refreshToken'

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters')
  }
  return secret
}

export function createAccessToken(userId: string): string {
  return jwt.sign({ tokenType: 'access' }, getJwtSecret(), {
    subject: userId,
    expiresIn: ACCESS_TOKEN_TTL,
    algorithm: 'HS256'
  })
}

export function verifyAccessToken(token: string): JwtPayload & { sub: string; tokenType: 'access' } {
  const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] })
  if (
    typeof decoded === 'string'
    || !decoded.sub
    || decoded.tokenType !== 'access'
  ) {
    throw new Error('Invalid access token')
  }
  return decoded as JwtPayload & { sub: string; tokenType: 'access' }
}

export function createRefreshToken(): string {
  return randomBytes(48).toString('base64url')
}

export function createRefreshTokenFamilyId(): string {
  return randomUUID()
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + getRefreshTokenTtlMs())
}

export function getRefreshCookieOptions() {
  const maxAge = getRefreshTokenTtlMs()
  const secure = process.env.REFRESH_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production'
  const configuredSameSite = (process.env.REFRESH_COOKIE_SAME_SITE || 'lax').toLowerCase()
  if (!['lax', 'strict', 'none'].includes(configuredSameSite)) {
    throw new Error('REFRESH_COOKIE_SAME_SITE must be lax, strict, or none')
  }
  if (configuredSameSite === 'none' && !secure) {
    throw new Error('SameSite=None refresh cookies require HTTPS')
  }
  return {
    httpOnly: true,
    secure,
    sameSite: configuredSameSite as 'lax' | 'strict' | 'none',
    path: '/api/auth',
    maxAge
  }
}

export function getClearRefreshCookieOptions() {
  const { maxAge: _maxAge, ...options } = getRefreshCookieOptions()
  return options
}

function getRefreshTokenTtlMs(): number {
  const configuredDays = process.env.REFRESH_TOKEN_DAYS
  const days = configuredDays === undefined ? DEFAULT_REFRESH_TOKEN_DAYS : Number(configuredDays)
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error('REFRESH_TOKEN_DAYS must be an integer between 1 and 365')
  }
  return days * 24 * 60 * 60 * 1000
}
