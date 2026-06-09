// Test Prisma + Turso adapter with correct v6 API
process.env.DATABASE_URL = 'file:./db/custom.db'

import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const url = 'libsql://grosirpj-handokov.aws-ap-northeast-1.turso.io'
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODEwMDA1NjUsImlkIjoiMDE5ZWFiZTYtNGYwMS03YmRiLThiN2QtMzhhY2I2OGYzZWNiIiwicmlkIjoiMjc3N2ZkZGYtMzEzYy00NzA2LTk2M2MtN2UzODcwYTZkMWQ5In0.sGMpmDFztDN2J7ccGEjwm89aU-U-rkZHPC1FfaYaYCoKWP4jXmWv0d5FseEX74mekeEPJ6Rb6A1WLlfYwErtBQ'

console.log('Creating PrismaLibSQL adapter factory with config...')
const adapter = new PrismaLibSQL({ url, authToken })

console.log('Creating PrismaClient with adapter...')
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Testing Prisma query...')
  const userCount = await prisma.user.count()
  console.log(`✅ Prisma User count: ${userCount}`)
  
  const productCount = await prisma.product.count()
  console.log(`✅ Prisma Product count: ${productCount}`)
  
  await prisma.$disconnect()
  console.log('Done!')
}

main().catch(e => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
