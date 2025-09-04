import { db } from './client'
import { Plan, Role, PlatformRole } from '@prisma/client'

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')

  try {
    // Clean existing data
    await db.content.deleteMany()
    await db.project.deleteMany()
    await db.workspace.deleteMany()
    await db.brandVoice.deleteMany()
    await db.usage.deleteMany()
    await db.apiKey.deleteMany()
    await db.membership.deleteMany()
    await db.organization.deleteMany()
    await db.user.deleteMany()

    console.log('🗑️ Cleaned existing data')

    // Create users with Clerk integration fields
    const user1 = await db.user.create({
      data: {
        clerkId: 'user_clerk_admin_12345', // Mock Clerk ID
        email: 'admin@thinktapfast.com',
        firstName: 'Admin',
        lastName: 'User',
        fullname: 'Admin User',
        image: 'https://github.com/shadcn.png',
        emailVerified: true,
        platformRole: PlatformRole.SUPER_ADMIN, // Make this user a super admin
      },
    })

    const user2 = await db.user.create({
      data: {
        clerkId: 'user_clerk_editor_67890', // Mock Clerk ID
        email: 'editor@thinktapfast.com',
        firstName: 'Editor',
        lastName: 'User',
        fullname: 'Editor User',
        image: 'https://github.com/vercel.png',
        emailVerified: true,
        platformRole: PlatformRole.USER,
      },
    })

    const user3 = await db.user.create({
      data: {
        clerkId: 'user_clerk_viewer_11111', // Mock Clerk ID
        email: 'viewer@thinktapfast.com',
        firstName: 'Viewer',
        lastName: 'User',
        fullname: 'Viewer User',
        emailVerified: false,
        platformRole: PlatformRole.USER,
      },
    })

    console.log('👤 Created users')

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

    // Create memberships
    await db.membership.createMany({
      data: [
        {
          userId: user1.id,
          orgId: freeOrg.id,
          role: Role.OWNER,
        },
        {
          userId: user1.id,
          orgId: proOrg.id,
          role: Role.OWNER,
        },
        {
          userId: user1.id,
          orgId: businessOrg.id,
          role: Role.OWNER,
        },
        {
          userId: user2.id,
          orgId: proOrg.id,
          role: Role.EDITOR,
        },
        {
          userId: user2.id,
          orgId: businessOrg.id,
          role: Role.ADMIN,
        },
        {
          userId: user3.id,
          orgId: businessOrg.id,
          role: Role.VIEWER,
        },
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

    // Create API keys
    await db.apiKey.createMany({
      data: [
        {
          orgId: proOrg.id,
          tokenHash: 'hashed_token_pro_1',
          label: 'Production API',
          lastUsed: new Date(),
        },
        {
          orgId: proOrg.id,
          tokenHash: 'hashed_token_pro_2',
          label: 'Development API',
        },
        {
          orgId: businessOrg.id,
          tokenHash: 'hashed_token_business_1',
          label: 'Main API Key',
          lastUsed: new Date(),
        },
        {
          orgId: businessOrg.id,
          tokenHash: 'hashed_token_business_2',
          label: 'Backup API Key',
        },
      ],
    })

    console.log('🔑 Created API keys')

    console.log('✅ Database seeding completed successfully!')
    
    // Log summary
    const counts = {
      users: await db.user.count(),
      organizations: await db.organization.count(),
      workspaces: await db.workspace.count(),
      projects: await db.project.count(),
      contents: await db.content.count(),
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
