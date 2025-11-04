import { NextRequest } from 'next/server'
import { verifyToken, extractTokenFromHeader } from './jwt'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string
    email: string
  }
}

export async function authenticateRequest(
  request: NextRequest
): Promise<{ userId: string; email: string } | null> {
  const authHeader = request.headers.get('authorization')
  const token = extractTokenFromHeader(authHeader)

  if (!token) {
    return null
  }

  const payload = verifyToken(token)
  if (!payload) {
    return null
  }

  return payload
}

