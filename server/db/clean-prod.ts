import { db } from './client'

async function cleanProductionDatabase() {
  console.log('🧹 Nuking production database...')
  
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ This script can only run in production environment!')
    process.exit(1)
  }

  try {
    console.log('⚠️  DANGER: This will DROP ALL TABLES and DELETE ALL DATA in PRODUCTION database!')
    console.log('💥 Nuclear option: Complete PRODUCTION database destruction!')
    console.log('⚠️  Make sure you have a backup before proceeding!')
    console.log('🔄 Starting production nuclear cleanup process...')

    // Add extra safety check for production (following Rule #31: Safety in production)
    if (!process.env.CONFIRM_PRODUCTION_CLEAN) {
      console.error('❌ Missing CONFIRM_PRODUCTION_CLEAN environment variable!')
      console.error('💡 Set CONFIRM_PRODUCTION_CLEAN=true to confirm production database destruction')
      process.exit(1)
    }

    // Drop all tables using raw SQL
    await dropAllTables()

    console.log('✅ Production database nuked successfully! (All tables dropped)')
    console.log('💡 Run "bun run db:setup:prod" to recreate schema and seed data')
    
  } catch (error) {
    console.error('❌ Error nuking production database:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

async function dropAllTables() {
  console.log('� Dropping all tables...')
  
  try {
    // Disable foreign key checks to allow table dropping
    await db.$executeRaw`SET session_replication_role = replica;`
    
    // Get all table names
    const tables = await db.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public';
    `
    
    console.log(`🗑️  Found ${tables.length} tables to drop`)
    
    // Drop each table
    for (const { tablename } of tables) {
      console.log(`🗑️  Dropping table: ${tablename}`)
      await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tablename}" CASCADE;`)
    }
    
    // Drop sequences if any
    const sequences = await db.$queryRaw<Array<{ sequencename: string }>>`
      SELECT sequencename FROM pg_sequences 
      WHERE schemaname = 'public';
    `
    
    for (const { sequencename } of sequences) {
      console.log(`🗑️  Dropping sequence: ${sequencename}`)
      await db.$executeRawUnsafe(`DROP SEQUENCE IF EXISTS "${sequencename}" CASCADE;`)
    }
    
    // Re-enable foreign key checks
    await db.$executeRaw`SET session_replication_role = DEFAULT;`
    
    console.log('💥 All tables and sequences dropped successfully!')
    
  } catch (error) {
    console.error('❌ Error dropping tables:', error)
    // Re-enable foreign key checks even on error
    try {
      await db.$executeRaw`SET session_replication_role = DEFAULT;`
    } catch (resetError) {
      console.error('❌ Error resetting foreign key checks:', resetError)
    }
    throw error
  }
}

// Run nuclear cleaning if this file is executed directly
if (require.main === module) {
  cleanProductionDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Production database nuking failed:', error)
      process.exit(1)
    })
}

export { cleanProductionDatabase as nukeProductionDatabase }
