import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../utils/db'

export const register = async (req: Request, res: Response) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : ''
    const password = typeof req.body.password === 'string' ? req.body.password : ''

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email inválido' })
    }
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username)) {
      return res.status(400).json({ error: 'El usuario debe tener entre 3 y 30 caracteres alfanuméricos' })
    }
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 72 caracteres' })
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword
      },
      select: { id: true, email: true, username: true, avatar: true, bio: true }
    })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' })
    res.json({ user, token })
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body.password === 'string' ? req.body.password : ''
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' })
    }
    const user = await prisma.user.findFirst({ where: { OR: [{ email }, { username: email }] } })

    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' })
    const { password: _, ...userData } = user

    res.json({ user: userData, token })
  } catch (error) {
    res.status(500).json({ error: 'Login failed' })
  }
}