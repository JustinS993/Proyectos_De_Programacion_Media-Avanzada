import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  username: z.string().trim().regex(/^[a-zA-Z0-9_.]{3,30}$/),
  password: z.string().min(8).max(72)
}).strict()

export const loginSchema = z.object({
  email: z.string().trim().min(1).max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72)
}).strict()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
