// Script to seed only permissions and roles

import { seedPermissions } from './seed-permissions';
import { db } from './client';

async function main() {
  console.log('🌱 Seeding ThinkTapFast permissions and roles...\n');
  
  try {
    await seedPermissions();
    console.log('\n🎉 Permission seeding completed successfully!');
    
    // Show summary
    const permissionCount = await db.permission.count();
    const roleCount = await db.role.count();
    
    console.log('\n📊 Summary:');
    console.log(`- Permissions: ${permissionCount}`);
    console.log(`- System Roles: ${roleCount}`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Create organizations in your app');
    console.log('2. Assign users to organizations with roles');
    console.log('3. Test the ABAC permission system');
    
  } catch (error) {
    console.error('❌ Permission seeding failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
