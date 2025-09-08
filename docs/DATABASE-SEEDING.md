# Database Seeding Guide

This guide explains how to seed your ThinkTapFast database with permissions, roles, and sample data.

## 📋 Available Seeding Commands

### 🔐 Permissions Only (Recommended for Production)
```bash
# Seed only permissions and roles (safe for production)
bun run db:seed:permissions
```

### 🌱 Full Database Seeding (Development)
```bash
# Complete database seeding with sample data
bun run db:seed
```

### 🔄 Database Reset & Seed
```bash
# Reset database and seed everything
bun run db:reset
```

### 🚀 Quick Setup (New Database)
```bash
# Generate Prisma client, push schema, and seed
bun run db:setup
```

## 🎯 What Gets Seeded

### Permission System (`db:seed:permissions`)
- **50+ Permissions**: Comprehensive permission matrix
  - Organization permissions (read, update, delete, invite, manage)
  - Workspace permissions (create, read, update, delete, manage)  
  - Project permissions (create, read, update, delete, manage)
  - Content permissions (create, read, update, delete, export, publish, schedule)
  - API Key permissions (create, read, update, delete)
  - User management permissions (invite, manage)
  - Billing permissions (read, update)
  - Comment permissions (create, read, update, delete)
  - Audit permissions (read)

- **12 System Roles**: Role hierarchy for different scopes
  - **Organization**: owner, admin, member, viewer
  - **Workspace**: admin, editor, viewer  
  - **Project**: owner, editor, collaborator, viewer

### Full Database (`db:seed`)
Includes everything above plus:
- **Sample Users**: Admin, Pro, Business, and Viewer users
- **Organizations**: Different plan types (FREE, PRO, BUSINESS)
- **Workspaces**: Sample workspaces with different settings
- **Projects**: Various project types and configurations
- **Content**: Sample content items and templates
- **Brand Voices**: Example brand voice configurations

## 🔧 Usage Examples

### 1. First Time Setup
```bash
# 1. Generate Prisma client
bun run db:generate

# 2. Push schema to database
bun run db:push

# 3. Seed permissions (required)
bun run db:seed:permissions

# 4. Optional: Seed sample data for development
bun run db:seed
```

### 2. Production Setup
```bash
# Production database setup
bun run db:generate:prod
bun run db:push:prod
bun run db:seed:permissions  # Only permissions, no sample data
```

### 3. Reset Development Database
```bash
# Reset and seed everything
bun run db:reset
```

### 4. Add Permissions to Existing Database
```bash
# Safe to run multiple times - upserts permissions
bun run db:seed:permissions
```

## 🏢 Organization-Specific Roles

After creating an organization in your app, you need to create organization-specific roles:

```typescript
import { seedOrganizationRoles } from '@/server/db/seed-permissions';

// When a new organization is created
await seedOrganizationRoles(organizationId);
```

This creates organization-specific copies of all system roles that can be assigned to users.

## 📊 Permission Matrix

### Plan-Based Capabilities

| Feature | FREE | PRO | BUSINESS | AGENCY |
|---------|------|-----|----------|--------|
| Content Creation | ✅ Basic | ✅ Advanced | ✅ Advanced | ✅ Advanced |
| Export (PDF) | ❌ | ✅ | ✅ | ✅ |
| Publishing | ❌ | ✅ | ✅ | ✅ |
| API Access | ❌ | ✅ Basic | ✅ Advanced | ✅ Advanced |
| Team Management | ❌ | ✅ | ✅ | ✅ |
| Workspaces | ❌ | ❌ | ✅ | ✅ |
| White-label | ❌ | ❌ | ❌ | ✅ |

### Role Hierarchies

#### Organization Roles
```
owner → admin → member → viewer
  ↑       ↑       ↑       ↑
Full    Manage   Work    Read
```

#### Workspace Roles  
```
admin → editor → viewer
  ↑       ↑       ↑
Manage  Edit    Read
```

#### Project Roles
```
owner → editor → collaborator → viewer
  ↑       ↑          ↑          ↑
Full    Edit      Comment     Read
```

## 🔍 Verification

After seeding, verify the setup:

```bash
# Check database with Prisma Studio
bun run db:studio

# Or check from your app
```

```typescript
import { db } from '@/server/db/client';

// Check permission count
const permissionCount = await db.permission.count();
console.log(`Permissions: ${permissionCount}`); // Should be ~50

// Check role count
const roleCount = await db.role.count();
console.log(`Roles: ${roleCount}`); // Should be ~12 system roles

// Check specific permissions
const contentPermissions = await db.permission.findMany({
  where: { key: { startsWith: 'content.' } }
});
console.log('Content permissions:', contentPermissions.map(p => p.key));
```

## 🚨 Important Notes

### ⚠️ Production Safety
- **`db:seed:permissions`** is safe for production (only adds/updates permissions)
- **`db:seed`** includes sample data - **DO NOT** run in production
- **`db:reset`** will delete ALL data - **NEVER** run in production

### 🔄 Idempotent Operations
- Permission seeding is idempotent (safe to run multiple times)
- Uses `upsert` operations to avoid duplicates
- Updates descriptions if permissions already exist

### 📝 Organization Setup Workflow
1. User creates account (Clerk)
2. User creates organization (your app)
3. System calls `seedOrganizationRoles(orgId)` automatically
4. User can be assigned roles within that organization

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check environment variables
echo $DATABASE_URL

# Verify database is accessible
bun run db:studio
```

### Permission Errors
```bash
# Reset and re-seed permissions
bun run db:seed:permissions
```

### Complete Reset (Development Only)
```bash
# Nuclear option - deletes everything
bun run db:reset
```

## 📚 Related Documentation

- [Server Auth Documentation](./SERVER-AUTH.md) - ABAC system details
- [ABAC Guide](./ABAC-GUIDE.md) - Permission system implementation
- [Prisma Schema](../prisma/schema.prisma) - Database structure
