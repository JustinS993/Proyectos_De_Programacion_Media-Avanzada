import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

export function createAuthenticatedSocket(accessToken: string): Socket {
  return io(SOCKET_URL, {
    auth: { token: accessToken },
    withCredentials: true,
    autoConnect: false
  })
}
