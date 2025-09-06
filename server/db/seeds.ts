import { db } from './client'
import { Plan, PlatformRole } from '@prisma/client'

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')

  try {
    // Clean existing data (order matters due to foreign key constraints)
    await db.contentTag.deleteMany()
    await db.projectTag.deleteMany()
    await db.comment.deleteMany()
    await db.notification.deleteMany()
    await db.auditLog.deleteMany()
    await db.usageEvent.deleteMany()
    await db.contentVersion.deleteMany()
    await db.content.deleteMany()
    await db.projectMembershipRole.deleteMany()
    await db.projectMembership.deleteMany()
    await db.workspaceMembershipRole.deleteMany()
    await db.workspaceMembership.deleteMany()
    await db.membershipRole.deleteMany()
    await db.project.deleteMany()
    await db.workspace.deleteMany()
    await db.brandVoice.deleteMany()
    await db.usage.deleteMany()
    await db.apiKey.deleteMany()
    await db.membership.deleteMany()
    await db.organizationSetting.deleteMany()
    await db.rolePermission.deleteMany()
    await db.role.deleteMany()
    await db.permission.deleteMany()
    await db.tag.deleteMany()
    await db.organization.deleteMany()
    await db.user.deleteMany()

    console.log('🗑️ Cleaned existing data')

    // Create users with enhanced Clerk integration fields
    const user1 = await db.user.create({
      data: {
        clerkId: 'user_clerk_admin_12345', // Mock Clerk ID
        email: 'admin@thinktapfast.com',
        username: 'admin_user',
        firstName: 'Admin',
        lastName: 'User',
        fullname: 'Admin User',
        image: 'https://github.com/shadcn.png',
        emailVerified: true,
        phoneNumber: '+1-555-0123',
        lastSignIn: new Date(),
        platformRole: PlatformRole.SUPER_ADMIN, // Make this user a super admin
        billingCustomerId: 'cus_admin_stripe_12345',
      },
    })

    const user2 = await db.user.create({
      data: {
        clerkId: 'user_clerk_editor_67890', // Mock Clerk ID
        email: 'editor@thinktapfast.com',
        username: 'editor_user',
        firstName: 'Editor',
        lastName: 'User',
        fullname: 'Editor User',
        image: 'https://github.com/vercel.png',
        emailVerified: true,
        phoneNumber: '+1-555-0124',
        lastSignIn: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        platformRole: PlatformRole.USER,
        billingCustomerId: 'cus_editor_stripe_67890',
      },
    })

    const user3 = await db.user.create({
      data: {
        clerkId: 'user_clerk_viewer_11111', // Mock Clerk ID
        email: 'viewer@thinktapfast.com',
        username: 'viewer_user',
        firstName: 'Viewer',
        lastName: 'User',
        fullname: 'Viewer User',
        emailVerified: false,
        platformRole: PlatformRole.USER,
      },
    })

    console.log('👤 Created users')

    // Create core permissions
    const permissions = await db.permission.createMany({
      data: [
        // Organization permissions
        { key: 'org.read', description: 'View organization details' },
        { key: 'org.update', description: 'Update organization settings' },
        { key: 'org.delete', description: 'Delete organization' },
        { key: 'org.invite', description: 'Invite users to organization' },
        { key: 'org.manage_members', description: 'Manage organization members' },
        { key: 'org.manage_billing', description: 'Manage billing and subscriptions' },
        
        // Workspace permissions
        { key: 'workspace.create', description: 'Create new workspaces' },
        { key: 'workspace.read', description: 'View workspace details' },
        { key: 'workspace.update', description: 'Update workspace settings' },
        { key: 'workspace.delete', description: 'Delete workspace' },
        { key: 'workspace.manage_members', description: 'Manage workspace members' },
        
        // Project permissions
        { key: 'project.create', description: 'Create new projects' },
        { key: 'project.read', description: 'View project details' },
        { key: 'project.update', description: 'Update project settings' },
        { key: 'project.delete', description: 'Delete project' },
        { key: 'project.manage_members', description: 'Manage project members' },
        
        // Content permissions
        { key: 'content.create', description: 'Create new content' },
        { key: 'content.read', description: 'View content' },
        { key: 'content.update', description: 'Edit content' },
        { key: 'content.delete', description: 'Delete content' },
        { key: 'content.publish', description: 'Publish content' },
        
        // API permissions
        { key: 'api.read', description: 'Read access via API' },
        { key: 'api.write', description: 'Write access via API' },
        { key: 'api.manage_keys', description: 'Manage API keys' },
      ],
    })

    const allPermissions = await db.permission.findMany()
    console.log('🔐 Created permissions')

    // Create organizations
    const freeOrg = await db.organization.create({
      data: {
        name: 'Startup Company',
        slug: 'startup-company',
        plan: Plan.FREE,
      },
    })

    const proOrg = await db.organization.create({
      data: {
        name: 'Pro Agency',
        slug: 'pro-agency',
        plan: Plan.PRO,
      },
    })

    const businessOrg = await db.organization.create({
      data: {
        name: 'Enterprise Corp',
        slug: 'enterprise-corp',
        plan: Plan.BUSINESS,
      },
    })

    console.log('🏢 Created organizations')

    // Create system roles for each organization
    const ownerRole = await db.role.create({
      data: {
        name: 'Owner',
        scope: 'ORGANIZATION',
        orgId: null, // System role template
        isSystem: true,
      },
    })

    const adminRole = await db.role.create({
      data: {
        name: 'Admin',
        scope: 'ORGANIZATION',
        orgId: null,
        isSystem: true,
      },
    })

    const editorRole = await db.role.create({
      data: {
        name: 'Editor',
        scope: 'ORGANIZATION',
        orgId: null,
        isSystem: true,
      },
    })

    const viewerRole = await db.role.create({
      data: {
        name: 'Viewer',
        scope: 'ORGANIZATION',
        orgId: null,
        isSystem: true,
      },
    })

    console.log('👑 Created system roles')

    // Create memberships
    const membership1 = await db.membership.create({
      data: {
        userId: user1.id,
        orgId: freeOrg.id,
      },
    })

    const membership2 = await db.membership.create({
      data: {
        userId: user1.id,
        orgId: proOrg.id,
      },
    })

    const membership3 = await db.membership.create({
      data: {
        userId: user1.id,
        orgId: businessOrg.id,
      },
    })

    const membership4 = await db.membership.create({
      data: {
        userId: user2.id,
        orgId: proOrg.id,
      },
    })

    const membership5 = await db.membership.create({
      data: {
        userId: user2.id,
        orgId: businessOrg.id,
      },
    })

    const membership6 = await db.membership.create({
      data: {
        userId: user3.id,
        orgId: businessOrg.id,
      },
    })

    // Assign roles to memberships
    await db.membershipRole.createMany({
      data: [
        { membershipId: membership1.id, roleId: ownerRole.id },
        { membershipId: membership2.id, roleId: ownerRole.id },
        { membershipId: membership3.id, roleId: ownerRole.id },
        { membershipId: membership4.id, roleId: editorRole.id },
        { membershipId: membership5.id, roleId: adminRole.id },
        { membershipId: membership6.id, roleId: viewerRole.id },
      ],
    })

    console.log('🤝 Created memberships')

    // Create workspaces
    const workspace1 = await db.workspace.create({
      data: {
        name: 'Marketing Campaigns',
        orgId: freeOrg.id,
      },
    })

    const workspace2 = await db.workspace.create({
      data: {
        name: 'Social Media Content',
        orgId: proOrg.id,
      },
    })

    const workspace3 = await db.workspace.create({
      data: {
        name: 'Blog & SEO',
        orgId: proOrg.id,
      },
    })

    const workspace4 = await db.workspace.create({
      data: {
        name: 'Enterprise Content Hub',
        orgId: businessOrg.id,
      },
    })

    console.log('🗂️ Created workspaces')

    // Create projects
    const project1 = await db.project.create({
      data: {
        name: 'Q4 Marketing Campaign',
        projectType: 'ads',
        workspaceId: workspace1.id,
      },
    })

    const project2 = await db.project.create({
      data: {
        name: 'Instagram Content Calendar',
        projectType: 'social',
        workspaceId: workspace2.id,
      },
    })

    const project3 = await db.project.create({
      data: {
        name: 'Tech Blog Series',
        projectType: 'blog',
        workspaceId: workspace3.id,
      },
    })

    const project4 = await db.project.create({
      data: {
        name: 'Product Launch Content',
        projectType: 'product',
        workspaceId: workspace4.id,
      },
    })

    console.log('📁 Created projects')

    // Create content
    await db.content.createMany({
      data: [
        {
          kind: 'ad',
          input: {
            prompt: 'Create a Facebook ad for a new SaaS product',
            tone: 'professional',
            length: 'short',
          },
          output: {
            versions: [
              {
                id: 1,
                text: 'Transform your business with AI-powered content generation. Get started free today! 🚀',
                timestamp: new Date().toISOString(),
              },
            ],
          },
          status: 'ready',
          projectId: project1.id,
        },
        {
          kind: 'post',
          input: {
            prompt: 'Instagram post about productivity tips',
            tone: 'casual',
            length: 'medium',
          },
          output: {
            versions: [
              {
                id: 1,
                text: '5 productivity hacks that changed my life ✨\n\n1. Time blocking\n2. The 2-minute rule\n3. Batch similar tasks\n4. Use the Pomodoro Technique\n5. Eliminate distractions\n\nWhich one will you try first? 👇',
                timestamp: new Date().toISOString(),
              },
            ],
          },
          status: 'published',
          projectId: project2.id,
        },
        {
          kind: 'post',
          input: {
            prompt: 'Blog post about AI trends in 2025',
            tone: 'informative',
            length: 'long',
          },
          output: {
            versions: [
              {
                id: 1,
                title: 'AI Trends Shaping 2025: What Businesses Need to Know',
                text: 'Artificial Intelligence continues to evolve rapidly, with 2025 bringing unprecedented opportunities for businesses...',
                timestamp: new Date().toISOString(),
              },
            ],
          },
          status: 'draft',
          projectId: project3.id,
        },
        {
          kind: 'email',
          input: {
            prompt: 'Product launch email announcement',
            tone: 'exciting',
            length: 'medium',
          },
          output: {
            versions: [
              {
                id: 1,
                subject: 'It\'s here! Introducing our game-changing new feature',
                text: 'We\'re thrilled to announce the launch of our most requested feature...',
                timestamp: new Date().toISOString(),
              },
            ],
          },
          status: 'scheduled',
          projectId: project4.id,
        },
      ],
    })

    console.log('📝 Created content')

    // Create brand voices
    await db.brandVoice.createMany({
      data: [
        {
          orgId: proOrg.id,
          docs: {
            sources: [
              'Brand guidelines document',
              'Previous marketing materials',
              'Tone of voice guide',
            ],
            embeddings: 'vector_data_placeholder',
          },
        },
        {
          orgId: businessOrg.id,
          docs: {
            sources: [
              'Corporate style guide',
              'Marketing playbook',
              'Brand identity manual',
            ],
            embeddings: 'vector_data_placeholder',
          },
        },
      ],
    })

    console.log('🎯 Created brand voices')

    // Create usage tracking
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    await db.usage.createMany({
      data: [
        {
          orgId: freeOrg.id,
          periodStart: monthStart,
          periodEnd: monthEnd,
          tokensIn: 1200,
          tokensOut: 3400,
          itemsGenerated: 15,
        },
        {
          orgId: proOrg.id,
          periodStart: monthStart,
          periodEnd: monthEnd,
          tokensIn: 8500,
          tokensOut: 25000,
          itemsGenerated: 127,
        },
        {
          orgId: businessOrg.id,
          periodStart: monthStart,
          periodEnd: monthEnd,
          tokensIn: 45000,
          tokensOut: 125000,
          itemsGenerated: 856,
        },
      ],
    })

    console.log('📊 Created usage data')

    // Create API keys with scopes
    await db.apiKey.createMany({
      data: [
        {
          orgId: proOrg.id,
          tokenHash: 'hashed_token_pro_1',
          label: 'Production API',
          scopes: ['read', 'write', 'content:create'],
          lastUsed: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
        {
          orgId: proOrg.id,
          tokenHash: 'hashed_token_pro_2',
          label: 'Development API',
          scopes: ['read', 'content:read'],
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        },
        {
          orgId: businessOrg.id,
          tokenHash: 'hashed_token_business_1',
          label: 'Main API Key',
          scopes: ['read', 'write', 'admin', 'content:*', 'project:*'],
          lastUsed: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
        {
          orgId: businessOrg.id,
          tokenHash: 'hashed_token_business_2',
          label: 'Backup API Key',
          scopes: ['read', 'write', 'content:create'],
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days
        },
      ],
    })

    console.log('🔑 Created API keys')

    // Create tags
    await db.tag.createMany({
      data: [
        { name: 'marketing' },
        { name: 'social-media' },
        { name: 'blog' },
        { name: 'urgent' },
        { name: 'draft' },
        { name: 'approved' },
        { name: 'campaign' },
        { name: 'product-launch' },
      ],
    })

    const allTags = await db.tag.findMany()
    console.log('🏷️ Created tags')

    // Create project tags
    await db.projectTag.createMany({
      data: [
        { projectId: project1.id, tagId: allTags.find(t => t.name === 'marketing')!.id },
        { projectId: project1.id, tagId: allTags.find(t => t.name === 'campaign')!.id },
        { projectId: project2.id, tagId: allTags.find(t => t.name === 'social-media')!.id },
        { projectId: project3.id, tagId: allTags.find(t => t.name === 'blog')!.id },
        { projectId: project4.id, tagId: allTags.find(t => t.name === 'product-launch')!.id },
        { projectId: project4.id, tagId: allTags.find(t => t.name === 'urgent')!.id },
      ],
    })

    // Create usage events
    await db.usageEvent.createMany({
      data: [
        {
          orgId: freeOrg.id,
          userId: user1.id,
          scope: 'ORGANIZATION',
          eventType: 'content.generation',
          tokensIn: 150,
          tokensOut: 300,
          meta: { contentType: 'ad', prompt: 'Facebook ad generation' },
        },
        {
          orgId: proOrg.id,
          userId: user2.id,
          scope: 'PROJECT',
          eventType: 'content.generation',
          tokensIn: 200,
          tokensOut: 500,
          meta: { contentType: 'post', prompt: 'Instagram post' },
        },
        {
          orgId: businessOrg.id,
          userId: user1.id,
          scope: 'WORKSPACE',
          eventType: 'api.call',
          tokensIn: 0,
          tokensOut: 0,
          meta: { endpoint: '/api/v1/generate', method: 'POST' },
        },
        {
          orgId: businessOrg.id,
          userId: user2.id,
          scope: 'PROJECT',
          eventType: 'project.create',
          tokensIn: 0,
          tokensOut: 0,
          meta: { projectType: 'product', workspaceId: workspace4.id },
        },
      ],
    })

    console.log('📈 Created usage events')

    // Create comments
    await db.comment.createMany({
      data: [
        {
          userId: user2.id,
          orgId: proOrg.id,
          projectId: project2.id,
          body: 'This Instagram content calendar looks great! Maybe we should add more posts for weekends?',
        },
        {
          userId: user1.id,
          orgId: businessOrg.id,
          projectId: project4.id,
          body: 'The product launch content needs to be reviewed by legal before we proceed.',
        },
        {
          userId: user3.id,
          orgId: businessOrg.id,
          contentId: (await db.content.findFirst({ where: { projectId: project4.id } }))!.id,
          body: 'I love the tone of this email! Very exciting and engaging.',
        },
      ],
    })

    console.log('💬 Created comments')

    // Create organization settings
    await db.organizationSetting.createMany({
      data: [
        {
          orgId: proOrg.id,
          config: {
            brandColors: ['#3B82F6', '#EF4444', '#10B981'],
            defaultTone: 'professional',
            contentGuidelines: 'Keep it engaging and on-brand',
            autoApprovalEnabled: false,
          },
        },
        {
          orgId: businessOrg.id,
          config: {
            brandColors: ['#1F2937', '#F59E0B', '#8B5CF6'],
            defaultTone: 'authoritative',
            contentGuidelines: 'All content must be approved by legal team',
            autoApprovalEnabled: false,
            requireLegalReview: true,
            maxContentLength: 10000,
          },
        },
      ],
    })

    console.log('⚙️ Created organization settings')

    console.log('✅ Database seeding completed successfully!')
    
    // Log summary
    const counts = {
      users: await db.user.count(),
      organizations: await db.organization.count(),
      roles: await db.role.count(),
      permissions: await db.permission.count(),
      memberships: await db.membership.count(),
      workspaces: await db.workspace.count(),
      projects: await db.project.count(),
      contents: await db.content.count(),
      apiKeys: await db.apiKey.count(),
      tags: await db.tag.count(),
      comments: await db.comment.count(),
      usageEvents: await db.usageEvent.count(),
    }
    
    console.log('📈 Summary:', counts)
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { seedDatabase }
