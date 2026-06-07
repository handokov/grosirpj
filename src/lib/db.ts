import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// On Vercel, use /tmp for the SQLite database
// The DATABASE_URL env var should be set to "file:/tmp/dev.db" on Vercel
function getDatabaseUrl() {
  const defaultUrl = process.env.DATABASE_URL || 'file:./dev.db';

  // If running on Vercel and DATABASE_URL is a relative path, redirect to /tmp
  if (process.env.VERCEL && defaultUrl.startsWith('file:./')) {
    return `file:/tmp/${defaultUrl.replace('file:./', '')}`;
  }

  return defaultUrl;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
