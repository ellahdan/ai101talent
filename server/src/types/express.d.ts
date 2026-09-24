import type { Role } from './index.js'

export interface AuthContext {
  id: string
  email: string
  role: Role
  isVerified: boolean
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthContext
    }
  }
}
