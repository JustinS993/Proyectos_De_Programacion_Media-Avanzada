import { z } from 'zod'

export const chatMessageSchema = z.object({
  receiverId: z.string().min(1).max(30),
  content: z.string().trim().min(1).max(2000)
}).strict()

export type ChatMessageInput = z.infer<typeof chatMessageSchema>
