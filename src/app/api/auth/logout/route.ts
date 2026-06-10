import { NextResponse } from 'next/server';
import { getClearSessionCookie } from '@/lib/auth';

/**
 * POST /api/auth/logout
 * Clears the JWT session cookie
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.set('Set-Cookie', getClearSessionCookie());
  return response;
}
