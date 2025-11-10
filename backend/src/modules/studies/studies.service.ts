import { Injectable } from '@nestjs/common';
import {
  MedicalImagingClient,
  GetImageSetMetadataCommand,
  GetImageSetCommand,
} from '@aws-sdk/client-medical-imaging';
import { ImagingSourcesService } from '../imaging-sources/imaging-sources.service';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudiesService {
  constructor(
    private imagingSourcesService: ImagingSourcesService,
    private cacheService: CacheService,
    private prisma: PrismaService,
  ) {}

  async getStudyMetadata(
    sourceId: string,
    imageSetId: string,
    userId: string,
    userRole: any,
  ) {
    // Check cache first
    const cacheKey = `metadata:${sourceId}:${imageSetId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get source
    const source = await this.prisma.imagingSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new Error('Imaging source not found');
    }

    // Check access
    await this.imagingSourcesService['checkAccess'](sourceId, userId, userRole);

    // Get credentials
    const credentials = await this.imagingSourcesService.getDecryptedCredentials(
      sourceId,
      userId,
      userRole,
    );

    // Create client
    const client = new MedicalImagingClient({
      region: source.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        ...(credentials.sessionToken && { sessionToken: credentials.sessionToken }),
      },
    });

    // Get metadata
    const command = new GetImageSetMetadataCommand({
      datastoreId: source.datastoreId,
      imageSetId,
    });

    const response = await client.send(command);

    // Parse metadata
    const metadataBlob = response.imageSetMetadataBlob;
    let metadata = null;

    if (metadataBlob) {
      // Convert the blob to string
      const decoder = new TextDecoder('utf-8');
      const metadataString = decoder.decode(
          metadataBlob as unknown as ArrayBuffer
      );
      metadata = JSON.parse(metadataString);
    }

    const result = {
      imageSetId,
      metadata,
      contentType: response.contentType,
      contentEncoding: response.contentEncoding,
    };

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, result, 3600);

    return result;
  }

  async getImageSet(
    sourceId: string,
    imageSetId: string,
    userId: string,
    userRole: any,
  ) {
    // Get source
    const source = await this.prisma.imagingSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new Error('Imaging source not found');
    }

    // Check access
    await this.imagingSourcesService['checkAccess'](sourceId, userId, userRole);

    // Get credentials
    const credentials = await this.imagingSourcesService.getDecryptedCredentials(
      sourceId,
      userId,
      userRole,
    );

    // Create client
    const client = new MedicalImagingClient({
      region: source.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        ...(credentials.sessionToken && { sessionToken: credentials.sessionToken }),
      },
    });

    // Get image set
    const command = new GetImageSetCommand({
      datastoreId: source.datastoreId,
      imageSetId,
    });

    const response = await client.send(command);

    return response;
  }
}
