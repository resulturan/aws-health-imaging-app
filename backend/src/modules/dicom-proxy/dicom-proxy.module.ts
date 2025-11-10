import { Module } from '@nestjs/common';
import { DicomProxyService } from './dicom-proxy.service';
import { DicomProxyController } from './dicom-proxy.controller';
import { ImagingSourcesModule } from '../imaging-sources/imaging-sources.module';

@Module({
  imports: [ImagingSourcesModule],
  controllers: [DicomProxyController],
  providers: [DicomProxyService],
})
export class DicomProxyModule {}
