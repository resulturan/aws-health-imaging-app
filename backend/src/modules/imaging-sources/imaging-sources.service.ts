import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { CacheService } from '../cache/cache.service';
import { CreateImagingSourceDto } from './dto/create-imaging-source.dto';
import { UpdateImagingSourceDto } from './dto/update-imaging-source.dto';
import { MedicalImagingClient, GetDatastoreCommand } from '@aws-sdk/client-medical-imaging';
import { Role } from '@prisma/client';

@Injectable()
export class ImagingSourcesService {
  constructor(
    private prisma: PrismaService,
    private credentialsService: CredentialsService,
    private cacheService: CacheService,
  ) {}

  async create(createDto: CreateImagingSourceDto, userId: string) {
    // Validate credentials
    if (!this.credentialsService.validateCredentials(createDto.credentials)) {
      throw new BadRequestException('Invalid AWS credentials format');
    }

    // Test connection before saving
    await this.testConnection(
      createDto.datastoreId,
      createDto.region,
      createDto.credentials,
    );

    // Encrypt credentials
    const encryptedCreds = this.credentialsService.encrypt(createDto.credentials);

    // Create imaging source
    const source = await this.prisma.imagingSource.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        datastoreId: createDto.datastoreId,
        region: createDto.region,
        encryptedCreds,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Remove encrypted credentials from response
    const { encryptedCreds: _, ...result } = source;
    return result;
  }

  async findAll(userId: string, userRole: Role) {
    // Admins and source managers can see all sources they own
    // Viewers can only see sources they have access to
    if (userRole === Role.VIEWER) {
      const accessGrants = await this.prisma.accessGrant.findMany({
        where: { userId },
        include: {
          imagingSource: {
            include: {
              owner: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      return accessGrants.map((grant) => {
        const { encryptedCreds, ...source } = grant.imagingSource;
        return source;
      });
    }

    // For admins and source managers, show all their sources
    const sources = await this.prisma.imagingSource.findMany({
      where: { ownerId: userId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return sources.map((source) => {
      const { encryptedCreds, ...result } = source;
      return result;
    });
  }

  async findOne(id: string, userId: string, userRole: Role) {
    const source = await this.prisma.imagingSource.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        accessGrants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!source) {
      throw new NotFoundException('Imaging source not found');
    }

    // Check access
    await this.checkAccess(id, userId, userRole);

    const { encryptedCreds, ...result } = source;
    return result;
  }

  async update(
    id: string,
    updateDto: UpdateImagingSourceDto,
    userId: string,
    userRole: Role,
  ) {
    const source = await this.prisma.imagingSource.findUnique({
      where: { id },
    });

    if (!source) {
      throw new NotFoundException('Imaging source not found');
    }

    // Only owner can update
    if (source.ownerId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this source');
    }

    let encryptedCreds = source.encryptedCreds;

    // If credentials are being updated, encrypt them
    if (updateDto.credentials) {
      if (!this.credentialsService.validateCredentials(updateDto.credentials)) {
        throw new BadRequestException('Invalid AWS credentials format');
      }

      // Test connection with new credentials
      await this.testConnection(
        updateDto.datastoreId || source.datastoreId,
        updateDto.region || source.region,
        updateDto.credentials,
      );

      encryptedCreds = this.credentialsService.encrypt(updateDto.credentials);

      // Clear cache
      await this.cacheService.del(`credentials:${id}`);
    }

    const { credentials, ...updateData } = updateDto;

    const updated = await this.prisma.imagingSource.update({
      where: { id },
      data: {
        ...updateData,
        ...(encryptedCreds !== source.encryptedCreds && { encryptedCreds }),
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const { encryptedCreds: _, ...result } = updated;
    return result;
  }

  async remove(id: string, userId: string, userRole: Role) {
    const source = await this.prisma.imagingSource.findUnique({
      where: { id },
    });

    if (!source) {
      throw new NotFoundException('Imaging source not found');
    }

    // Only owner or admin can delete
    if (source.ownerId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this source');
    }

    // Clear cache
    await this.cacheService.del(`credentials:${id}`);

    await this.prisma.imagingSource.delete({ where: { id } });

    return { message: 'Imaging source deleted successfully' };
  }

  async grantAccess(sourceId: string, userId: string, requesterId: string, userRole: Role) {
    const source = await this.prisma.imagingSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new NotFoundException('Imaging source not found');
    }

    // Only owner or admin can grant access
    if (source.ownerId !== requesterId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to grant access');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if access already granted
    const existing = await this.prisma.accessGrant.findUnique({
      where: {
        userId_imagingSourceId: {
          userId,
          imagingSourceId: sourceId,
        },
      },
    });

    if (existing) {
      return { message: 'Access already granted' };
    }

    await this.prisma.accessGrant.create({
      data: {
        userId,
        imagingSourceId: sourceId,
      },
    });

    return { message: 'Access granted successfully' };
  }

  async revokeAccess(sourceId: string, userId: string, requesterId: string, userRole: Role) {
    const source = await this.prisma.imagingSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new NotFoundException('Imaging source not found');
    }

    // Only owner or admin can revoke access
    if (source.ownerId !== requesterId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to revoke access');
    }

    await this.prisma.accessGrant.deleteMany({
      where: {
        userId,
        imagingSourceId: sourceId,
      },
    });

    return { message: 'Access revoked successfully' };
  }

  async getDecryptedCredentials(sourceId: string, userId: string, userRole: Role) {
    // Check cache first
    const cacheKey = `credentials:${sourceId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const source = await this.prisma.imagingSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new NotFoundException('Imaging source not found');
    }

    // Check access
    await this.checkAccess(sourceId, userId, userRole);

    const credentials = this.credentialsService.decrypt(source.encryptedCreds);

    // Cache for 15 minutes
    await this.cacheService.set(cacheKey, credentials, 900);

    return credentials;
  }

  private async checkAccess(sourceId: string, userId: string, userRole: Role) {
    const source = await this.prisma.imagingSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new NotFoundException('Imaging source not found');
    }

    // Admin has access to all
    if (userRole === Role.ADMIN) {
      return true;
    }

    // Owner has access
    if (source.ownerId === userId) {
      return true;
    }

    // Check if user has been granted access
    const accessGrant = await this.prisma.accessGrant.findUnique({
      where: {
        userId_imagingSourceId: {
          userId,
          imagingSourceId: sourceId,
        },
      },
    });

    if (!accessGrant) {
      throw new ForbiddenException('You do not have access to this imaging source');
    }

    return true;
  }

  private async testConnection(datastoreId: string, region: string, credentials: any) {
    try {
      const client = new MedicalImagingClient({
        region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          ...(credentials.sessionToken && { sessionToken: credentials.sessionToken }),
        },
      });

      const command = new GetDatastoreCommand({ datastoreId });
      await client.send(command);

      return true;
    } catch (error) {
      throw new BadRequestException(
        `Failed to connect to AWS HealthImaging: ${error.message}`,
      );
    }
  }
}
