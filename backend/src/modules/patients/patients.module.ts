import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { ImagingSourcesModule } from '../imaging-sources/imaging-sources.module';

@Module({
  imports: [ImagingSourcesModule],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
