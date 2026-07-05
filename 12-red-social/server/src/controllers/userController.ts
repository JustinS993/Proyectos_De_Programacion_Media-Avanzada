import { Request, Response } from 'express'
import prisma from '../utils/db'

export const getProfile = async (req: Request, res: Response) => {
  try {
    const { username } = req.params
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        posts: { orderBy: { createdAt: 'desc' } }
      }
    })

    if (!user) return res.status(404).json({ error: 'User not found' })

    const { password: _, ...userData } = user
    res.json(userData)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' })
  }
}

export const toggleFollow = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const currentUserId = req.userId

    if (userId === currentUserId) return res.status(400).json({ error: 'Cannot follow yourself' })

    const existingFollow = await prisma.follows.findUnique({
      where: { followerId_followingId: { followerId: currentUserId!, followingId: userId } }
    })

    if (existingFollow) {
      await prisma.follows.delete({
        where: { followerId_followingId: { followerId: currentUserId!, followingId: userId } }
      })
      res.json({ following: false })
    } else {
      await prisma.follows.create({
        data: { followerId: currentUserId!, followingId: userId }
      })
      res.json({ following: true })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle follow' })
  }
}

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { query } = req.query
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query as string, mode: 'insensitive' } },
          { email: { contains: query as string, mode: 'insensitive' } }
        ]
      },
      select: { id: true, username: true, avatar: true }
    })

    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Search failed' })
  }
}