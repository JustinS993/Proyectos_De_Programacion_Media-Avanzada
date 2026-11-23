import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import http from 'http'
import { io as createClient, Socket as ClientSocket } from 'socket.io-client'
import bcrypt from 'bcrypt'

const prismaMock = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn()
  },
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn()
  },
  message: { create: vi.fn() },
  $transaction: vi.fn(),
  $connect: vi.fn()
}))

vi.mock('../src/utils/db', () => ({ default: prismaMock }))

import { app, createSocketServer } from '../src/app'
import { createAccessToken, getRefreshCookieOptions } from '../src/utils/tokens'

const testUser = {
  id: 'user-authenticated',
  email: 'person@example.com',
  username: 'person',
  password: '',
  avatar: null,
  bio: null
}

describe('authentication and chat security', () => {
  let server: http.Server | undefined
  let ioServer: ReturnType<typeof createSocketServer> | undefined
  let clientSocket: ClientSocket | undefined
  let secondSocket: ClientSocket | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters'
    prismaMock.user.findFirst.mockResolvedValue(null)
    prismaMock.user.findUnique.mockImplementation(async ({ where }) => ({ id: where.id }))
    prismaMock.user.create.mockResolvedValue({
      id: testUser.id,
      email: testUser.email,
      username: testUser.username,
      avatar: null,
      bio: null
    })
    prismaMock.refreshToken.create.mockResolvedValue({})
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.message.create.mockImplementation(async ({ data }) => ({
      id: 'message-id',
      ...data,
      sender: { id: data.senderId, username: 'person', avatar: null },
      receiver: { id: data.receiverId, username: 'recipient', avatar: null }
    }))
    prismaMock.$transaction.mockImplementation(async (callback) => callback({
      refreshToken: {
        updateMany: prismaMock.refreshToken.updateMany,
        create: prismaMock.refreshToken.create
      }
    }))
  })

  afterEach(async () => {
    clientSocket?.disconnect()
    secondSocket?.disconnect()
    clientSocket = undefined
    secondSocket = undefined
    if (ioServer) {
      await new Promise<void>((resolve) => ioServer!.close(() => resolve()))
      ioServer = undefined
      server = undefined
    }
  })

  it('validates registration and stores refresh tokens only in HttpOnly cookies', async () => {
    const invalid = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', username: 'x', password: 'short' })
    expect(invalid.status).toBe(400)
    expect(prismaMock.user.create).not.toHaveBeenCalled()

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'Person@Example.com',
        username: 'person',
        password: 'password-long'
      })

    expect(response.status).toBe(201)
    expect(response.body.user.email).toBe(testUser.email)
    expect(response.body.token).toBeTruthy()
    expect(response.body.refreshToken).toBeUndefined()
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly')
    expect(prismaMock.user.create.mock.calls[0][0].data.password).not.toBe('password-long')
  })

  it('rotates a valid refresh token atomically and revokes it on logout', async () => {
    const rawRefreshToken = 'refresh-token-value-that-is-long-enough'
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-id',
      tokenHash: 'stored-hash',
      familyId: 'family-id',
      userId: testUser.id,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: testUser.id,
        email: testUser.email,
        username: testUser.username,
        avatar: null,
        bio: null
      }
    })

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `refreshToken=${rawRefreshToken}`)

    expect(response.status).toBe(200)
    expect(response.body.token).toBeTruthy()
    expect(prismaMock.$transaction).toHaveBeenCalledOnce()
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly')
    expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledOnce()

    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', `refreshToken=${rawRefreshToken}`)
    expect(logoutResponse.status).toBe(204)
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled()
  })

  it('rejects a revoked refresh token without rotating it again', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: 'revoked-refresh-id',
      familyId: 'revoked-family-id',
      userId: testUser.id,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      user: testUser
    })

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=refresh-token-value-that-is-long-enough')

    expect(response.status).toBe(401)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { familyId: 'revoked-family-id', revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    })
  })

  it('requires secure cookies when configured for cross-site refresh', () => {
    const oldNodeEnv = process.env.NODE_ENV
    const oldSecure = process.env.REFRESH_COOKIE_SECURE
    const oldSameSite = process.env.REFRESH_COOKIE_SAME_SITE
    process.env.NODE_ENV = 'production'
    process.env.REFRESH_COOKIE_SECURE = 'false'
    process.env.REFRESH_COOKIE_SAME_SITE = 'none'

    try {
      expect(getRefreshCookieOptions()).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
    } finally {
      if (oldNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = oldNodeEnv
      if (oldSecure === undefined) delete process.env.REFRESH_COOKIE_SECURE
      else process.env.REFRESH_COOKIE_SECURE = oldSecure
      if (oldSameSite === undefined) delete process.env.REFRESH_COOKIE_SAME_SITE
      else process.env.REFRESH_COOKIE_SAME_SITE = oldSameSite
    }
  })

  it('rejects unauthenticated sockets and derives message sender from the JWT', async () => {
    server = http.createServer(app)
    ioServer = createSocketServer(server)
    await new Promise<void>((resolve) => server!.listen(0, resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Expected TCP address')
    const url = `http://127.0.0.1:${address.port}`

    const unauthenticated = createClient(url, { transports: ['websocket'] })
    const authError = new Promise<string>((resolve) => {
      unauthenticated.once('connect_error', (error) => resolve(error.message))
    })
    expect(await authError).toContain('Authentication required')
    unauthenticated.disconnect()

    clientSocket = createClient(url, {
      auth: { token: createAccessToken(testUser.id) },
      transports: ['websocket']
    })
    await new Promise<void>((resolve, reject) => {
      clientSocket!.once('connect', resolve)
      clientSocket!.once('connect_error', reject)
    })

    const result = await new Promise<{ message?: { senderId: string }; error?: string }>((resolve) => {
      clientSocket!.emit('send_message', {
        receiverId: 'receiver-id',
        content: '  hello  '
      }, resolve)
    })
    expect(result.message?.senderId).toBe(testUser.id)
    expect(prismaMock.message.create.mock.calls[0][0].data).toEqual({
      content: 'hello',
      senderId: testUser.id,
      receiverId: 'receiver-id'
    })
  })

  it('rejects spoofed chat fields and enforces a per-user message rate limit', async () => {
    server = http.createServer(app)
    ioServer = createSocketServer(server)
    await new Promise<void>((resolve) => server!.listen(0, resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Expected TCP address')

    clientSocket = createClient(`http://127.0.0.1:${address.port}`, {
      auth: { token: createAccessToken(testUser.id) },
      transports: ['websocket']
    })
    await new Promise<void>((resolve, reject) => {
      clientSocket!.once('connect', resolve)
      clientSocket!.once('connect_error', reject)
    })

    const spoofed = await new Promise<{ error?: string }>((resolve) => {
      clientSocket!.emit('send_message', {
        senderId: 'forged-user',
        receiverId: 'receiver-id',
        content: 'hello'
      }, resolve)
    })
    expect(spoofed.error).toBe('Invalid message data')
    expect(prismaMock.message.create).not.toHaveBeenCalled()

    let lastResponse: { error?: string } | undefined
    for (let index = 0; index < 21; index += 1) {
      lastResponse = await new Promise<{ error?: string }>((resolve) => {
        clientSocket!.emit('send_message', {
          receiverId: 'receiver-id',
          content: `message ${index}`
        }, resolve)
      })
    }
    expect(lastResponse?.error).toBe('Rate limit exceeded')
    expect(prismaMock.message.create).toHaveBeenCalledTimes(19)

    clientSocket.disconnect()
    secondSocket = createClient(`http://127.0.0.1:${address.port}`, {
      auth: { token: createAccessToken(testUser.id) },
      transports: ['websocket']
    })
    await new Promise<void>((resolve, reject) => {
      secondSocket!.once('connect', resolve)
      secondSocket!.once('connect_error', reject)
    })
    const sharedRateLimit = await new Promise<{ error?: string }>((resolve) => {
      secondSocket!.emit('send_message', {
        receiverId: 'receiver-id',
        content: 'another socket'
      }, resolve)
    })
    expect(sharedRateLimit.error).toBe('Rate limit exceeded')
  })

  it('accepts a password hash for login without returning sensitive fields', async () => {
    const password = 'correct-password'
    prismaMock.user.findFirst.mockResolvedValue({
      ...testUser,
      password: await bcrypt.hash(password, 4)
    })

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password })

    expect(response.status).toBe(200)
    expect(response.body.user.password).toBeUndefined()
    expect(response.body.token).toBeTruthy()
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly')
  })
})
