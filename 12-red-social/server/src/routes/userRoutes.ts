import express from 'express'
import { getProfile, toggleFollow, searchUsers } from '../controllers/userController'
import { authenticate } from '../middleware/auth'

const router = express.Router()

router.get('/search', authenticate, searchUsers)
router.get('/:username', authenticate, getProfile)
router.post('/:userId/follow', authenticate, toggleFollow)

export default router