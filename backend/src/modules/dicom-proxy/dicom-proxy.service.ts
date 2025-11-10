import { Injectable } from '@nestjs/common';
import {
  MedicalImagingClient,
  GetImageFrameCommand,
  GetImageSetMetadataCommand,
} from '@aws-sdk/client-medical-imaging';
import { ImagingSourcesService } from '../imaging-sources/imaging-sources.service';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { Readable } from 'stream';

@Injectable()
export class DicomProxyService {
  constructor(
    private imagingSourcesService: ImagingSourcesService,
    private cacheService: CacheService,
    private prisma: PrismaService,
  ) {}

  async getImageFrame(
    sourceId: string,
    imageSetId: string,
    imageFrameId: string,
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

    // Get image frame
    const command = new GetImageFrameCommand({
      datastoreId: source.datastoreId,
      imageSetId,
      imageFrameInformation: {
        imageFrameId,
      },
    });

    const response = await client.send(command);

    return {
      imageFrameBlob: response.imageFrameBlob,
      contentType: response.contentType,
    };
  }

  async getMetadata(
    sourceId: string,
    imageSetId: string,
    userId: string,
    userRole: any,
  ) {
    // Check cache first
    const cacheKey = `dicom-metadata:${sourceId}:${imageSetId}`;
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
      const decoder = new TextDecoder('utf-8');
      const metadataString = decoder.decode(metadataBlob);
      metadata = JSON.parse(metadataString);
    }

    const result = {
      metadata,
      contentType: response.contentType,
    };

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, result, 3600);

    return result;
  }

  /**
   * Convert Uint8Array to Buffer for streaming
   */
  private streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
