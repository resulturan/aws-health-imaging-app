import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class GdprService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Export all user data in a portable format (GDPR Right to Data Portability)
   */
  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        imagingSources: true,
        accessGrants: {
          include: {
            imagingSource: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get audit logs for this user
    const auditLogs = await this.auditService.getUserActivity(userId, 1000);

    // Prepare export data
    const exportData = {
      exportDate: new Date().toISOString(),
      userData: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        dataProcessingConsent: user.dataProcessingConsent,
        consentDate: user.consentDate,
        dataRetentionDays: user.dataRetentionDays,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      imagingSources: user.imagingSources.map((source) => ({
        id: source.id,
        name: source.name,
        description: source.description,
        datastoreId: source.datastoreId,
        region: source.region,
        isActive: source.isActive,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      })),
      accessGrants: user.accessGrants.map((grant) => ({
        id: grant.id,
        imagingSourceName: grant.imagingSource.name,
        imagingSourceId: grant.imagingSourceId,
        grantedAt: grant.createdAt,
      })),
      auditLogs: auditLogs.map((log) => ({
        action: log.action,
        resource: log.resource,
        timestamp: log.createdAt,
        details: log.details,
      })),
    };

    // Log the data export action
    await this.auditService.log({
      userId,
      userEmail: user.email,
      action: 'USER_UPDATE' as any, // Using existing enum value
      details: { action: 'data_export' },
    });

    return exportData;
  }

  /**
   * Delete all user data (GDPR Right to Erasure/Right to be Forgotten)
   */
  async deleteUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Log the deletion request before deleting
    await this.auditService.log({
      userId,
      userEmail: user.email,
      action: 'USER_DELETE' as any,
      details: { reason: 'GDPR Right to Erasure' },
    });

    // Delete user and all related data (cascading deletes will handle relations)
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      message: 'User data deleted successfully',
      deletedAt: new Date().toISOString(),
      userId,
    };
  }

  /**
   * Update user consent for data processing
   */
  async updateConsent(userId: string, consent: boolean) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        dataProcessingConsent: consent,
        consentDate: consent ? new Date() : null,
      },
    });

    await this.auditService.log({
      userId,
      userEmail: user.email,
      action: 'USER_UPDATE' as any,
      details: { action: 'consent_update', consent },
    });

    return {
      dataProcessingConsent: user.dataProcessingConsent,
      consentDate: user.consentDate,
    };
  }

  /**
   * Get user consent status
   */
  async getConsentStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        dataProcessingConsent: true,
        consentDate: true,
        dataRetentionDays: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update data retention period
   */
  async updateDataRetention(userId: string, days: number) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        dataRetentionDays: days,
      },
    });

    await this.auditService.log({
      userId,
      userEmail: user.email,
      action: 'USER_UPDATE' as any,
      details: { action: 'data_retention_update', days },
    });

    return {
      dataRetentionDays: user.dataRetentionDays,
    };
  }
}
