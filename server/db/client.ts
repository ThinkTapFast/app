import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

// Configure Neon for serverless environments
neonConfig.webSocketConstructor = ws

// For edge environments (Cloudflare Workers, Vercel Edge, etc.), enable querying over fetch
if (process.env.NODE_ENV === 'production') {
  neonConfig.poolQueryViaFetch = true
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!
  const adapter = new PrismaNeon({ connectionString })
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect()
})
