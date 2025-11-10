import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AuditAction } from '@prisma/client';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN) // Only admins can view audit logs
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.getLogs({
      userId,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('logs/resource')
  async getLogsByResource(@Query('resource') resource: string) {
    if (!resource) {
      throw new Error('Resource parameter is required');
    }
    return this.auditService.getLogsByResource(resource);
  }

  @Get('logs/user')
  async getUserActivity(
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    if (!userId) {
      throw new Error('userId parameter is required');
    }
    return this.auditService.getUserActivity(
      userId,
      limit ? parseInt(limit) : undefined,
    );
  }
}
