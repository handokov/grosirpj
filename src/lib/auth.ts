import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { parse } from 'cookie';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'grosirpj-dev-secret-key'
);

// Warn at runtime if using default secret in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ WARNING: JWT_SECRET not set! Using default secret is insecure in production.');
}

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
  
  // Legacy simpleHash no longer supported - force password reset
  return false;
}

// Legacy simpleHash removed for security.
// Users with legacy hashes will be forced to reset their password.

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

// getUserIdFromRequest removed for security. Use getAuthUser() directly.
// Never trust userId from query parameters.
