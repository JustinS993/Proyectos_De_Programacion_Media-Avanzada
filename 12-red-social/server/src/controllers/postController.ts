import { Request, Response } from 'express'
import prisma from '../utils/db'

export const getFeed = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const following = await prisma.follows.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    })
    const followingIds = following.map(f => f.followingId)
    followingIds.push(userId!)

    const posts = await prisma.post.findMany({
      where: { userId: { in: followingIds } },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        likes: true,
        comments: { include: { user: { select: { id: true, username: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(posts)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get feed' })
  }
}

export const createPost = async (req: Request, res: Response) => {
  try {
    const { content, imageUrl, videoUrl } = req.body
    const userId = req.userId

    const post = await prisma.post.create({
      data: { content, imageUrl, videoUrl, userId: userId! },
      include: { user: { select: { id: true, username: true, avatar: true } } }
    })

    res.json(post)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' })
  }
}

export const toggleLike = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params
    const userId = req.userId

    const existingLike = await prisma.like.findUnique({
      where: { userId_postId: { userId: userId!, postId } }
    })

    if (existingLike) {
      await prisma.like.delete({ where: { userId_postId: { userId: userId!, postId } } })
      res.json({ liked: false })
    } else {
      await prisma.like.create({ data: { userId: userId!, postId } })
      res.json({ liked: true })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle like' })
  }
}

export const addComment = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params
    const { content } = req.body
    const userId = req.userId

    const comment = await prisma.comment.create({
      data: { content, postId, userId: userId! },
      include: { user: { select: { id: true, username: true } } }
    })

    res.json(comment)
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' })
  }
}