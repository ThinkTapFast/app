// server/actions/content/project-actions.ts - Project management server actions

'use server';

import { db } from '@/server/db/client';
import { withPermissionAction } from '@/server/actions/auth/permissions';
import type { Project } from '@prisma/client';

// Types for project actions
interface CreateProjectInput {
  name: string;
  projectType: string;
  workspaceId: string;
}

interface UpdateProjectInput {
  id: string;
  name?: string;
  projectType?: string;
}

interface ProjectWithWorkspace extends Project {
  workspace: {
    id: string;
    name: string;
    orgId: string;
  };
  _count: {
    contents: number;
  };
}

/**
 * Create new project
 */
export const createProject = withPermissionAction(
  'project',
  'create',
  async (data: CreateProjectInput): Promise<Project> => {
    const project = await db.project.create({
      data: {
        name: data.name,
        projectType: data.projectType,
        workspaceId: data.workspaceId,
      },
    });

    return project;
  },
  {
    extractContextFromArgs: (data: CreateProjectInput) => ({
      workspaceId: data.workspaceId,
    }),
    revalidateOnSuccess: '/dashboard/projects',
  }
);

/**
 * Get project by ID
 */
export const getProject = withPermissionAction(
  'project',
  'read',
  async (projectId: string): Promise<ProjectWithWorkspace | null> => {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            orgId: true,
          },
        },
        _count: {
          select: {
            contents: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    return project;
  },
  {
    extractContextFromArgs: (projectId: string) => ({ projectId }),
  }
);

/**
 * Update project
 */
export const updateProject = withPermissionAction(
  'project',
  'update',
  async (data: UpdateProjectInput): Promise<Project> => {
    const updateData: Partial<Project> = {};
    
    if (data.name) updateData.name = data.name;
    if (data.projectType) updateData.projectType = data.projectType;

    const project = await db.project.update({
      where: { id: data.id },
      data: updateData,
    });

    return project;
  },
  {
    extractContextFromArgs: (data: UpdateProjectInput) => ({
      projectId: data.id,
    }),
    revalidateOnSuccess: '/dashboard/projects',
  }
);

/**
 * Delete project
 */
export const deleteProject = withPermissionAction(
  'project',
  'delete',
  async (projectId: string): Promise<{ success: boolean }> => {
    // Soft delete project and all its contents
    await db.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });

    // Soft delete all contents in the project
    await db.content.updateMany({
      where: { projectId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  },
  {
    extractContextFromArgs: (projectId: string) => ({ projectId }),
    revalidateOnSuccess: '/dashboard/projects',
  }
);

/**
 * Get projects for workspace
 */
export const getWorkspaceProjects = withPermissionAction(
  'workspace',
  'read',
  async (workspaceId: string): Promise<ProjectWithWorkspace[]> => {
    const projects = await db.project.findMany({
      where: { 
        workspaceId,
        deletedAt: null,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            orgId: true,
          },
        },
        _count: {
          select: {
            contents: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects;
  },
  {
    extractContextFromArgs: (workspaceId: string) => ({ workspaceId }),
  }
);

/**
 * Get projects for organization
 */
export const getOrganizationProjects = withPermissionAction(
  'organization',
  'read',
  async (orgId: string): Promise<ProjectWithWorkspace[]> => {
    const projects = await db.project.findMany({
      where: { 
        workspace: { orgId },
        deletedAt: null,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            orgId: true,
          },
        },
        _count: {
          select: {
            contents: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects;
  },
  {
    extractContextFromArgs: (orgId: string) => ({ orgId }),
  }
);

/**
 * Duplicate project
 */
export const duplicateProject = withPermissionAction(
  'project',
  'create',
  async (projectId: string, newName?: string): Promise<Project> => {
    const originalProject = await db.project.findUnique({
      where: { id: projectId },
      include: {
        contents: {
          where: { deletedAt: null },
        },
      },
    });

    if (!originalProject) {
      throw new Error('Project not found');
    }

    // Create new project
    const duplicatedProject = await db.project.create({
      data: {
        name: newName || `${originalProject.name} (Copy)`,
        projectType: originalProject.projectType,
        workspaceId: originalProject.workspaceId,
      },
    });

    // Duplicate all contents
    for (const content of originalProject.contents) {
      await db.content.create({
        data: {
          kind: content.kind,
          input: content.input,
          output: content.output,
          status: 'draft', // Reset status to draft
          projectId: duplicatedProject.id,
        },
      });
    }

    return duplicatedProject;
  },
  {
    extractContextFromArgs: async (projectId: string) => {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { workspaceId: true },
      });
      return { workspaceId: project?.workspaceId };
    },
    revalidateOnSuccess: '/dashboard/projects',
  }
);
