// Seed default permissions and roles

import { db } from './client';
import type { Scope } from '@prisma/client';

// Default permissions for the ABAC system
const DEFAULT_PERMISSIONS = [
  // Organization permissions
  { key: 'org.read', description: 'View organization details' },
  { key: 'org.update', description: 'Update organization settings' },
  { key: 'org.delete', description: 'Delete organization' },
  { key: 'org.invite', description: 'Invite users to organization' },
  { key: 'org.manage', description: 'Full organization management' },
  
  // Workspace permissions
  { key: 'workspace.create', description: 'Create new workspaces' },
  { key: 'workspace.read', description: 'View workspace details' },
  { key: 'workspace.update', description: 'Update workspace settings' },
  { key: 'workspace.delete', description: 'Delete workspaces' },
  { key: 'workspace.manage', description: 'Full workspace management' },
  
  // Project permissions
  { key: 'project.create', description: 'Create new projects' },
  { key: 'project.read', description: 'View project details' },
  { key: 'project.update', description: 'Update project settings' },
  { key: 'project.delete', description: 'Delete projects' },
  { key: 'project.manage', description: 'Full project management' },
  
  // Content permissions
  { key: 'content.create', description: 'Create new content' },
  { key: 'content.read', description: 'View content' },
  { key: 'content.update', description: 'Edit content' },
  { key: 'content.delete', description: 'Delete content' },
  { key: 'content.export', description: 'Export content to PDF/CSV' },
  { key: 'content.publish', description: 'Publish content' },
  { key: 'content.schedule', description: 'Schedule content' },
  
  // API Key permissions
  { key: 'apikey.create', description: 'Create API keys' },
  { key: 'apikey.read', description: 'View API keys' },
  { key: 'apikey.update', description: 'Update API key settings' },
  { key: 'apikey.delete', description: 'Delete API keys' },
  
  // User management permissions
  { key: 'user.invite', description: 'Invite users' },
  { key: 'user.manage', description: 'Manage user roles and permissions' },
  
  // Billing permissions
  { key: 'billing.read', description: 'View billing information' },
  { key: 'billing.update', description: 'Update billing settings' },
  
  // Comment permissions
  { key: 'comment.create', description: 'Add comments' },
  { key: 'comment.read', description: 'View comments' },
  { key: 'comment.update', description: 'Edit comments' },
  { key: 'comment.delete', description: 'Delete comments' },
  
  // Audit permissions
  { key: 'audit.read', description: 'View audit logs' },
];

// Default system roles with their permissions
const DEFAULT_ROLES = {
  // Organization-level roles
  organization: [
    {
      name: 'owner',
      scope: 'ORGANIZATION' as Scope,
      isSystem: true,
      permissions: [
        'org.read', 'org.update', 'org.delete', 'org.invite', 'org.manage',
        'workspace.create', 'workspace.read', 'workspace.update', 'workspace.delete', 'workspace.manage',
        'project.create', 'project.read', 'project.update', 'project.delete', 'project.manage',
        'content.create', 'content.read', 'content.update', 'content.delete', 'content.export', 'content.publish', 'content.schedule',
        'apikey.create', 'apikey.read', 'apikey.update', 'apikey.delete',
        'user.invite', 'user.manage',
        'billing.read', 'billing.update',
        'comment.create', 'comment.read', 'comment.update', 'comment.delete',
        'audit.read',
      ],
    },
    {
      name: 'admin',
      scope: 'ORGANIZATION' as Scope,
      isSystem: true,
      permissions: [
        'org.read', 'org.update', 'org.invite', 'org.manage',
        'workspace.create', 'workspace.read', 'workspace.update', 'workspace.delete', 'workspace.manage',
        'project.create', 'project.read', 'project.update', 'project.delete', 'project.manage',
        'content.create', 'content.read', 'content.update', 'content.delete', 'content.export', 'content.publish', 'content.schedule',
        'apikey.create', 'apikey.read', 'apikey.update', 'apikey.delete',
        'user.invite', 'user.manage',
        'billing.read',
        'comment.create', 'comment.read', 'comment.update', 'comment.delete',
        'audit.read',
      ],
    },
    {
      name: 'member',
      scope: 'ORGANIZATION' as Scope,
      isSystem: true,
      permissions: [
        'org.read',
        'workspace.read',
        'project.create', 'project.read', 'project.update',
        'content.create', 'content.read', 'content.update', 'content.export',
        'apikey.read',
        'comment.create', 'comment.read', 'comment.update',
      ],
    },
    {
      name: 'viewer',
      scope: 'ORGANIZATION' as Scope,
      isSystem: true,
      permissions: [
        'org.read',
        'workspace.read',
        'project.read',
        'content.read',
        'comment.read',
      ],
    },
  ],
  
  // Workspace-level roles
  workspace: [
    {
      name: 'admin',
      scope: 'WORKSPACE' as Scope,
      isSystem: true,
      permissions: [
        'workspace.read', 'workspace.update', 'workspace.manage',
        'project.create', 'project.read', 'project.update', 'project.delete', 'project.manage',
        'content.create', 'content.read', 'content.update', 'content.delete', 'content.export', 'content.publish', 'content.schedule',
        'user.invite',
        'comment.create', 'comment.read', 'comment.update', 'comment.delete',
      ],
    },
    {
      name: 'editor',
      scope: 'WORKSPACE' as Scope,
      isSystem: true,
      permissions: [
        'workspace.read',
        'project.create', 'project.read', 'project.update',
        'content.create', 'content.read', 'content.update', 'content.export', 'content.publish',
        'comment.create', 'comment.read', 'comment.update',
      ],
    },
    {
      name: 'viewer',
      scope: 'WORKSPACE' as Scope,
      isSystem: true,
      permissions: [
        'workspace.read',
        'project.read',
        'content.read',
        'comment.read',
      ],
    },
  ],
  
  // Project-level roles
  project: [
    {
      name: 'owner',
      scope: 'PROJECT' as Scope,
      isSystem: true,
      permissions: [
        'project.read', 'project.update', 'project.delete', 'project.manage',
        'content.create', 'content.read', 'content.update', 'content.delete', 'content.export', 'content.publish', 'content.schedule',
        'user.invite',
        'comment.create', 'comment.read', 'comment.update', 'comment.delete',
      ],
    },
    {
      name: 'editor',
      scope: 'PROJECT' as Scope,
      isSystem: true,
      permissions: [
        'project.read', 'project.update',
        'content.create', 'content.read', 'content.update', 'content.export', 'content.publish',
        'comment.create', 'comment.read', 'comment.update',
      ],
    },
    {
      name: 'collaborator',
      scope: 'PROJECT' as Scope,
      isSystem: true,
      permissions: [
        'project.read',
        'content.create', 'content.read', 'content.update', 'content.export',
        'comment.create', 'comment.read', 'comment.update',
      ],
    },
    {
      name: 'viewer',
      scope: 'PROJECT' as Scope,
      isSystem: true,
      permissions: [
        'project.read',
        'content.read',
        'comment.read',
      ],
    },
  ],
};

export async function seedPermissions() {
  console.log('🌱 Seeding permissions...');
  
  try {
    // Create permissions
    for (const permission of DEFAULT_PERMISSIONS) {
      await db.permission.upsert({
        where: { key: permission.key },
        update: { description: permission.description },
        create: permission,
      });
    }
    
    console.log(`✅ Created ${DEFAULT_PERMISSIONS.length} permissions`);
    
    // Create system roles
    let totalRoles = 0;
    
    for (const [scope, roles] of Object.entries(DEFAULT_ROLES)) {
      for (const roleData of roles) {
        // Create the role
        const role = await db.role.upsert({
          where: {
            id: `system-${scope}-${roleData.name}`, // Use a predictable ID for system roles
          },
          update: {
            name: roleData.name,
            scope: roleData.scope,
            isSystem: roleData.isSystem,
          },
          create: {
            id: `system-${scope}-${roleData.name}`,
            name: roleData.name,
            scope: roleData.scope,
            orgId: null, // System roles have no org
            isSystem: roleData.isSystem,
          },
        });
        
        // Get permission IDs
        const permissions = await db.permission.findMany({
          where: {
            key: { in: roleData.permissions },
          },
        });
        
        // Clear existing role permissions
        await db.rolePermission.deleteMany({
          where: { roleId: role.id },
        });
        
        // Create role permissions
        for (const permission of permissions) {
          await db.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
        }
        
        totalRoles++;
      }
    }
    
    console.log(`✅ Created ${totalRoles} system roles`);
    console.log('🎉 Permission seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
}

// Function to seed permissions for a specific organization (copies system roles)
export async function seedOrganizationRoles(orgId: string) {
  console.log(`🌱 Seeding organization roles for org: ${orgId}`);
  
  try {
    let totalRoles = 0;
    
    // Get system roles to copy
    const systemRoles = await db.role.findMany({
      where: { isSystem: true, orgId: null },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
    
    for (const systemRole of systemRoles) {
      // Create organization-specific role based on system role
      const orgRole = await db.role.upsert({
        where: {
          id: `org-${orgId}-${systemRole.scope.toLowerCase()}-${systemRole.name}`,
        },
        update: {
          name: systemRole.name,
          scope: systemRole.scope,
          orgId: orgId,
          isSystem: false,
        },
        create: {
          id: `org-${orgId}-${systemRole.scope.toLowerCase()}-${systemRole.name}`,
          name: systemRole.name,
          scope: systemRole.scope,
          orgId: orgId,
          isSystem: false,
        },
      });
      
      // Clear existing role permissions
      await db.rolePermission.deleteMany({
        where: { roleId: orgRole.id },
      });
      
      // Copy permissions from system role
      for (const rolePermission of systemRole.rolePermissions) {
        await db.rolePermission.create({
          data: {
            roleId: orgRole.id,
            permissionId: rolePermission.permission.id,
          },
        });
      }
      
      totalRoles++;
    }
    
    console.log(`✅ Created ${totalRoles} organization roles for org: ${orgId}`);
    
  } catch (error) {
    console.error(`❌ Error seeding organization roles for org ${orgId}:`, error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedPermissions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
