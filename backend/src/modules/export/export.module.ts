import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { DicomProxyModule } from '../dicom-proxy/dicom-proxy.module';

@Module({
  imports: [DicomProxyModule],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
