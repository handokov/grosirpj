import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { parse } from 'cookie';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'grosirpj-secret-key-change-in-production-2024'
);

const COOKIE_NAME = 'grosirpj_token';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a bcrypt hash
 * Also supports legacy simpleHash for backward compatibility
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // Try bcrypt first
  if (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$')) {
    return bcrypt.compare(password, hashedPassword);
  }
  
  // Fallback to legacy simpleHash for existing users
  const legacyHash = simpleHash(password);
  if (hashedPassword === legacyHash) {
    return true;
  }
  
  return false;
}

/**
 * Legacy simple hash function - kept for backward compatibility with existing passwords
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Create a JWT token and return the Set-Cookie header value
 */
export async function createSessionToken(payload: AuthPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 days
    .sign(JWT_SECRET);

  return token;
}

/**
 * Get the Set-Cookie header value for a session token
 */
export function getSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`;
}

/**
 * Get the Set-Cookie header value for clearing the session
 */
export function getClearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * Verify a JWT token from the request cookies
 */
export async function verifySessionToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

/**
 * Get the authenticated user from a request (reads JWT from cookies)
 * Returns null if not authenticated
 */
export async function getAuthUser(request: Request): Promise<AuthPayload | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = parse(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  return verifySessionToken(token);
}

/**
 * Get userId from either JWT cookie or query parameter (backward compatible)
 * For write operations, prefer JWT for security
 */
export async function getUserIdFromRequest(request: Request, requireAuth = false): Promise<string | null> {
  // Try JWT first
  const authUser = await getAuthUser(request);
  if (authUser) {
    return authUser.userId;
  }

  // Fallback to query parameter for backward compatibility (read-only)
  if (!requireAuth) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    return userId;
  }

  return null;
}
