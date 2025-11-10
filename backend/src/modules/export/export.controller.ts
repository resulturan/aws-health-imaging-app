import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('study/:imageSetId')
  @Header('Content-Type', 'application/zip')
  async exportStudy(
    @Param('imageSetId') imageSetId: string,
    @Query('sourceId') sourceId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    // Set headers for download
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="study_${imageSetId}.zip"`,
    );
    res.setHeader('Content-Type', 'application/zip');

    // Get the archive stream
    const archiveStream = await this.exportService.exportStudy(
      sourceId,
      imageSetId,
      user.id,
      user.role,
    );

    // Pipe the archive stream to the response
    archiveStream.pipe(res);

    // Handle errors
    archiveStream.on('error', (error) => {
      console.error('Error streaming archive:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to export study' });
      }
    });
  }
}
