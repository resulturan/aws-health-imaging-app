import { Injectable } from '@nestjs/common';
import {
  MedicalImagingClient,
  SearchImageSetsCommand,
  SearchCriteria,
} from '@aws-sdk/client-medical-imaging';
import { ImagingSourcesService } from '../imaging-sources/imaging-sources.service';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchPatientsDto } from './dto/search-patients.dto';

@Injectable()
export class PatientsService {
  constructor(
    private imagingSourcesService: ImagingSourcesService,
    private cacheService: CacheService,
    private prisma: PrismaService,
  ) {}

  async searchPatients(dto: SearchPatientsDto, userId: string, userRole: any) {
    // Get source and check access
    const source = await this.prisma.imagingSource.findUnique({
      where: { id: dto.sourceId },
    });

    if (!source) {
      throw new Error('Imaging source not found');
    }

    // Check if user has access
    await this.imagingSourcesService['checkAccess'](dto.sourceId, userId, userRole);

    // Get decrypted credentials
    const credentials = await this.imagingSourcesService.getDecryptedCredentials(
      dto.sourceId,
      userId,
      userRole,
    );

    // Create AWS client
    const client = new MedicalImagingClient({
      region: source.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        ...(credentials.sessionToken && { sessionToken: credentials.sessionToken }),
      },
    });

    // Build search criteria
    const searchCriteria: SearchCriteria = {};

    // Search image sets
    const command = new SearchImageSetsCommand({
      datastoreId: source.datastoreId,
      searchCriteria,
      maxResults: dto.limit || 20,
      ...(dto.nextToken && { nextToken: dto.nextToken }),
    });

    const response = await client.send(command);

    // Group by patient
    const patientsMap = new Map();

    if (response.imageSetsMetadataSummaries) {
      for (const imageSet of response.imageSetsMetadataSummaries) {
        const patientId = imageSet.DICOMTags?.DICOMPatientId || 'Unknown';
        const patientName = imageSet.DICOMTags?.DICOMPatientName || 'Unknown';

        if (!patientsMap.has(patientId)) {
          patientsMap.set(patientId, {
            patientId,
            patientName,
            patientBirthDate: imageSet.DICOMTags?.DICOMPatientBirthDate,
            patientSex: imageSet.DICOMTags?.DICOMPatientSex,
            studies: [],
          });
        }

        const patient = patientsMap.get(patientId);
        patient.studies.push({
          imageSetId: imageSet.imageSetId,
          studyInstanceUID: imageSet.DICOMTags?.DICOMStudyInstanceUID,
          studyDate: imageSet.DICOMTags?.DICOMStudyDate,
          studyDescription: imageSet.DICOMTags?.DICOMStudyDescription,
          modality: imageSet.DICOMTags?.DICOMSeriesModality,
          numberOfStudyRelatedSeries: imageSet.DICOMTags?.DICOMNumberOfStudyRelatedSeries,
          numberOfStudyRelatedInstances:
            imageSet.DICOMTags?.DICOMNumberOfStudyRelatedInstances,
        });
      }
    }

    const patients = Array.from(patientsMap.values());

    // Filter by search term if provided
    let filteredPatients = patients;
    if (dto.search) {
      const searchTerm = dto.search.toLowerCase();
      filteredPatients = patients.filter(
        (p) =>
          p.patientId?.toLowerCase().includes(searchTerm) ||
          p.patientName?.toLowerCase().includes(searchTerm),
      );
    }

    return {
      patients: filteredPatients,
      nextToken: response.nextToken,
      total: filteredPatients.length,
    };
  }

  async getPatientStudies(
    sourceId: string,
    patientId: string,
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

    // Search for this patient's studies
    const command = new SearchImageSetsCommand({
      datastoreId: source.datastoreId,
      searchCriteria: {},
    });

    const response = await client.send(command);

    const studies = [];
    if (response.imageSetsMetadataSummaries) {
      for (const imageSet of response.imageSetsMetadataSummaries) {
        if (imageSet.DICOMTags?.DICOMPatientId === patientId) {
          studies.push({
            imageSetId: imageSet.imageSetId,
            studyInstanceUID: imageSet.DICOMTags?.DICOMStudyInstanceUID,
            studyDate: imageSet.DICOMTags?.DICOMStudyDate,
            studyTime: imageSet.DICOMTags?.DICOMStudyTime,
            studyDescription: imageSet.DICOMTags?.DICOMStudyDescription,
            modality: imageSet.DICOMTags?.DICOMSeriesModality,
            numberOfStudyRelatedSeries: imageSet.DICOMTags?.DICOMNumberOfStudyRelatedSeries,
            numberOfStudyRelatedInstances:
              imageSet.DICOMTags?.DICOMNumberOfStudyRelatedInstances,
            updatedAt: imageSet.updatedAt,
            createdAt: imageSet.createdAt,
          });
        }
      }
    }

    return studies;
  }
}
