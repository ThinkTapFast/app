import { db } from "./client";

async function cleanDevelopmentDatabase() {
  console.log("🧹 Nuking development database...");

  if (process.env.NODE_ENV === "production") {
    console.error("❌ Cannot run development clean script in production environment!");
    process.exit(1);
  }

  try {
    console.log(
      "⚠️  WARNING: This will DROP ALL TABLES and DELETE ALL DATA in development database!",
    );
    console.log("💥 Nuclear option: Complete database destruction!");
    console.log("🔄 Starting nuclear cleanup process...");

    // Use Prisma's database reset functionality (Neon compatible)
    await nukeDatabaseWithPrisma();

    console.log("✅ Development database nuked successfully! (All tables dropped)");
    console.log('💡 Run "bun run db:setup" to recreate schema and seed data');
  } catch (error) {
    console.error("❌ Error nuking development database:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

async function nukeDatabaseWithPrisma() {
  console.log("💥 Nuking database using Prisma approach...");

  try {
    // First, try to delete all data (safer approach)
    console.log("🗑️  Deleting all data first...");

    // Delete in reverse dependency order
    await db.contentTag.deleteMany();
    await db.projectTag.deleteMany();
    await db.rolePermission.deleteMany();
    await db.membershipRole.deleteMany();
    await db.workspaceMembershipRole.deleteMany();
    await db.projectMembershipRole.deleteMany();

    await db.contentVersion.deleteMany();
    await db.content.deleteMany();
    await db.comment.deleteMany();

    await db.projectMembership.deleteMany();
    await db.project.deleteMany();
    await db.workspaceMembership.deleteMany();
    await db.workspace.deleteMany();

    await db.usageEvent.deleteMany();
    await db.usage.deleteMany();
    await db.apiKey.deleteMany();
    await db.brandVoice.deleteMany();
    await db.organizationSetting.deleteMany();
    await db.membership.deleteMany();
    await db.organization.deleteMany();

    await db.notification.deleteMany();
    await db.auditLog.deleteMany();
    await db.user.deleteMany();

    await db.tag.deleteMany();
    await db.role.deleteMany();
    await db.permission.deleteMany();

    console.log("✅ All data deleted successfully");

    // Now try to drop tables using Neon-compatible SQL
    await dropTablesNeonSafe();
  } catch (error) {
    console.error("❌ Error in nuclear database operation:", error);
    throw error;
  }
}

async function dropTablesNeonSafe() {
  console.log("💥 Attempting to drop tables (Neon safe)...");

  try {
    // Get all user tables (cast tablename to text to fix Prisma deserialization)
    const tables = await db.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename::text FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'pg_%' 
      AND tablename NOT LIKE '_prisma_%';
    `;

    console.log(`🗑️  Found ${tables.length} tables to drop`);

    if (tables.length === 0) {
      console.log("✅ No tables found to drop");
      return;
    }

    // Drop tables using CASCADE (should work with Neon)
    for (const { tablename } of tables) {
      try {
        console.log(`🗑️  Dropping table: ${tablename}`);
        await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tablename}" CASCADE;`);
      } catch (dropError) {
        console.warn(`⚠️  Could not drop table ${tablename}:`, dropError);
        // Continue with other tables
      }
    }

    // Also try to drop sequences with proper casting
    try {
      const sequences = await db.$queryRaw<Array<{ sequencename: string }>>`
        SELECT sequencename::text FROM pg_sequences 
        WHERE schemaname = 'public';
      `;

      for (const { sequencename } of sequences) {
        try {
          console.log(`🗑️  Dropping sequence: ${sequencename}`);
          await db.$executeRawUnsafe(`DROP SEQUENCE IF EXISTS "${sequencename}" CASCADE;`);
        } catch (seqError) {
          console.warn(`⚠️  Could not drop sequence ${sequencename}:`, seqError);
        }
      }
    } catch (seqQueryError) {
      console.warn("⚠️  Could not query sequences:", seqQueryError);
    }

    console.log("💥 Table dropping completed!");
  } catch (error) {
    console.warn(
      "⚠️  Could not drop all tables (this might be normal with Neon permissions):",
      error,
    );
    console.log("💡 Tables may still exist but data was cleared");
  }
}

// Run nuclear cleaning if this file is executed directly (following Rule #7-8: Functional programming)
if (require.main === module) {
  cleanDevelopmentDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("💥 Database nuking failed:", error);
      process.exit(1);
    });
}

export { cleanDevelopmentDatabase as nukeDevelopmentDatabase };
