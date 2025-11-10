import { Module } from '@nestjs/common';
import { ImagingSourcesService } from './imaging-sources.service';
import { ImagingSourcesController } from './imaging-sources.controller';

@Module({
  controllers: [ImagingSourcesController],
  providers: [ImagingSourcesService],
  exports: [ImagingSourcesService],
})
export class ImagingSourcesModule {}
