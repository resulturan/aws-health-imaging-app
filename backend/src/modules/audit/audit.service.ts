import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

export interface AuditLogData {
  userId?: string;
  userEmail?: string;
  action: AuditAction;
  resource?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: AuditLogData) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          userEmail: data.userEmail,
          action: data.action,
          resource: data.resource,
          details: data.details || {},
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          success: data.success ?? true,
          errorMessage: data.errorMessage,
        },
      });
    } catch (error) {
      // Don't throw errors from audit logging to avoid breaking main functionality
      console.error('Failed to create audit log:', error);
    }
  }

  async getLogs(filters?: {
    userId?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async getLogsByResource(resource: string) {
    return this.prisma.auditLog.findMany({
      where: { resource },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getUserActivity(userId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Convenience methods for common audit events
  async logUserLogin(userId: string, userEmail: string, ipAddress?: string, userAgent?: string) {
    return this.log({
      userId,
      userEmail,
      action: AuditAction.USER_LOGIN,
      ipAddress,
      userAgent,
    });
  }

  async logUserLogout(userId: string, userEmail: string, ipAddress?: string) {
    return this.log({
      userId,
      userEmail,
      action: AuditAction.USER_LOGOUT,
      ipAddress,
    });
  }

  async logStudyView(userId: string, userEmail: string, imageSetId: string, sourceId: string) {
    return this.log({
      userId,
      userEmail,
      action: AuditAction.STUDY_VIEW,
      resource: imageSetId,
      details: { sourceId },
    });
  }

  async logStudyExport(userId: string, userEmail: string, imageSetId: string, sourceId: string) {
    return this.log({
      userId,
      userEmail,
      action: AuditAction.STUDY_EXPORT,
      resource: imageSetId,
      details: { sourceId },
    });
  }

  async logFrameAccess(userId: string, userEmail: string, imageSetId: string, frameId: string) {
    return this.log({
      userId,
      userEmail,
      action: AuditAction.FRAME_ACCESS,
      resource: imageSetId,
      details: { frameId },
    });
  }

  async logSourceCreate(userId: string, userEmail: string, sourceId: string, sourceName: string) {
    return this.log({
      userId,
      userEmail,
      action: AuditAction.SOURCE_CREATE,
      resource: sourceId,
      details: { sourceName },
    });
  }

  async logSourceUpdate(userId: string, userEmail: string, sourceId: string) {
    return this.log({
      userId,
      userEmail,
      action: AuditAction.SOURCE_UPDATE,
      resource: sourceId,
    });
  }

  async logSourceDelete(userId: string, userEmail: string, sourceId: string) {
    return this.log({
      userId,
      userEmail,
      action: AuditAction.SOURCE_DELETE,
      resource: sourceId,
    });
  }

  async logAccessGranted(adminId: string, adminEmail: string, userId: string, sourceId: string) {
    return this.log({
      userId: adminId,
      userEmail: adminEmail,
      action: AuditAction.SOURCE_ACCESS_GRANTED,
      resource: sourceId,
      details: { targetUserId: userId },
    });
  }
}
