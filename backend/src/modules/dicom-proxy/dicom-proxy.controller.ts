import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { DicomProxyService } from './dicom-proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('dicom-proxy')
@UseGuards(JwtAuthGuard)
export class DicomProxyController {
  constructor(private readonly dicomProxyService: DicomProxyService) {}

  @Get('frames/:imageSetId/:imageFrameId')
  async getImageFrame(
    @Param('imageSetId') imageSetId: string,
    @Param('imageFrameId') imageFrameId: string,
    @Query('sourceId') sourceId: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.dicomProxyService.getImageFrame(
      sourceId,
      imageSetId,
      imageFrameId,
      user.id,
      user.role,
    );

    res.set({
      'Content-Type': result.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    });

    return new StreamableFile(result.imageFrameBlob);
  }

  @Get('metadata/:imageSetId')
  async getMetadata(
    @Param('imageSetId') imageSetId: string,
    @Query('sourceId') sourceId: string,
    @CurrentUser() user: any,
  ) {
    return this.dicomProxyService.getMetadata(
      sourceId,
      imageSetId,
      user.id,
      user.role,
    );
  }
}
