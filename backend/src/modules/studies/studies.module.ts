import { Module } from '@nestjs/common';
import { StudiesService } from './studies.service';
import { StudiesController } from './studies.controller';
import { ImagingSourcesModule } from '../imaging-sources/imaging-sources.module';

@Module({
  imports: [ImagingSourcesModule],
  controllers: [StudiesController],
  providers: [StudiesService],
})
export class StudiesModule {}
