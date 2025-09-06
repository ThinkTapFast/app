'use server';

import { db } from '@/server/db/client';
import { withPermissionAction } from '@/server/actions/auth/permissions';
import type { Content, ContentVersion, Prisma } from '@prisma/client';
import type { ContentInput, ContentOutput } from '@/server/auth/types/index';

// Types for content actions
interface CreateContentInput {
  kind: string;
  input: ContentInput;
  output: ContentOutput;
  projectId: string;
}

interface UpdateContentInput {
  id: string;
  input?: ContentInput;
  output?: ContentOutput;
  status?: string;
}

interface ContentWithVersions extends Content {
  versions: ContentVersion[];
  project: {
    id: string;
    name: string;
    workspaceId: string;
  };
}

/**
 * Create new content
 */
export const createContent = withPermissionAction(
  'content',
  'create',
  async (data: CreateContentInput): Promise<Content> => {
    // Create content with initial version
    const content = await db.content.create({
      data: {
        kind: data.kind,
        input: data.input as Prisma.InputJsonValue,
        output: data.output as Prisma.InputJsonValue,
        status: 'draft',
        projectId: data.projectId,
      },
    });

    // Create initial version
    await db.contentVersion.create({
      data: {
        contentId: content.id,
        version: 1,
        output: data.output as Prisma.InputJsonValue,
        createdBy: null, // Will be set by middleware
      },
    });

    return content;
  },
  {
    extractContextFromArgs: (data: CreateContentInput) => ({
      projectId: data.projectId,
    }),
    revalidateOnSuccess: '/dashboard/projects',
  }
);

/**
 * Get content by ID
 */
export const getContent = withPermissionAction(
  'content',
  'read',
  async (contentId: string): Promise<ContentWithVersions | null> => {
    const content = await db.content.findUnique({
      where: { id: contentId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                image: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            workspaceId: true,
          },
        },
      },
    });

    return content;
  },
  {
    // Note: Since contentId is not available from args, we'll handle context internally
    revalidateOnSuccess: '/dashboard/content',
  }
);

/**
 * Update content
 */
export const updateContent = withPermissionAction(
  'content',
  'update',
  async (data: UpdateContentInput): Promise<Content> => {
    const updateData: Record<string, Prisma.InputJsonValue | string> = {};
    
    if (data.input) updateData.input = data.input as Prisma.InputJsonValue;
    if (data.output) updateData.output = data.output as Prisma.InputJsonValue;
    if (data.status) updateData.status = data.status;

    const content = await db.content.update({
      where: { id: data.id },
      data: updateData,
    });

    // Create new version if output changed
    if (data.output) {
      const lastVersion = await db.contentVersion.findFirst({
        where: { contentId: data.id },
        orderBy: { version: 'desc' },
      });

      await db.contentVersion.create({
        data: {
          contentId: data.id,
          version: (lastVersion?.version || 0) + 1,
          output: data.output as Prisma.InputJsonValue,
          createdBy: null, // Will be set by middleware
        },
      });
    }

    return content;
  },
  {
    revalidateOnSuccess: '/dashboard/content',
  }
);

/**
 * Delete content
 */
export const deleteContent = withPermissionAction(
  'content',
  'delete',
  async (contentId: string): Promise<{ success: boolean }> => {
    // Soft delete
    await db.content.update({
      where: { id: contentId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  },
  {
    revalidateOnSuccess: '/dashboard/content',
  }
);

/**
 * Publish content
 */
export const publishContent = withPermissionAction(
  'content',
  'publish',
  async (contentId: string): Promise<Content> => {
    const content = await db.content.update({
      where: { id: contentId },
      data: { status: 'published' },
    });

    return content;
  },
  {
    revalidateOnSuccess: '/dashboard/content',
  }
);

/**
 * Schedule content
 */
export const scheduleContent = withPermissionAction(
  'content',
  'schedule',
  async (contentId: string, _publishAt: Date): Promise<Content> => {
    const content = await db.content.update({
      where: { id: contentId },
      data: { 
        status: 'scheduled',
        // You might want to add a publishAt field to your schema
      },
    });

    return content;
  },
  {
    revalidateOnSuccess: '/dashboard/content',
  }
);

/**
 * Get content for project
 */
export const getProjectContent = withPermissionAction(
  'project',
  'read',
  async (projectId: string): Promise<Content[]> => {
    const contents = await db.content.findMany({
      where: { 
        projectId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        versions: {
          take: 1,
          orderBy: { version: 'desc' },
        },
      },
    });

    return contents;
  },
  {
    extractContextFromArgs: (projectId: string) => ({ projectId }),
  }
);

/**
 * Duplicate content
 */
export const duplicateContent = withPermissionAction(
  'content',
  'create',
  async (contentId: string): Promise<Content> => {
    const originalContent = await db.content.findUnique({
      where: { id: contentId },
    });

    if (!originalContent) {
      throw new Error('Content not found');
    }

    const duplicatedContent = await db.content.create({
      data: {
        kind: originalContent.kind,
        input: originalContent.input as Prisma.InputJsonValue,
        output: originalContent.output as Prisma.InputJsonValue,
        status: 'draft',
        projectId: originalContent.projectId,
      },
    });

    // Create initial version for duplicated content
    await db.contentVersion.create({
      data: {
        contentId: duplicatedContent.id,
        version: 1,
        output: originalContent.output as Prisma.InputJsonValue,
        createdBy: null, // Will be set by middleware
      },
    });

    return duplicatedContent;
  },
  {
    revalidateOnSuccess: '/dashboard/content',
  }
);
