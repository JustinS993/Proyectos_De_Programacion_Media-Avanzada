import express from 'express'
import { getFeed, createPost, toggleLike, addComment } from '../controllers/postController'
import { authenticate } from '../middleware/auth'

const router = express.Router()

router.get('/feed', authenticate, getFeed)
router.post('/', authenticate, createPost)
router.post('/:postId/like', authenticate, toggleLike)
router.post('/:postId/comment', authenticate, addComment)

export default router