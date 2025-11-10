import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { StudiesService } from './studies.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('studies')
@UseGuards(JwtAuthGuard)
export class StudiesController {
  constructor(private readonly studiesService: StudiesService) {}

  @Get(':imageSetId/metadata')
  getStudyMetadata(
    @Param('imageSetId') imageSetId: string,
    @Query('sourceId') sourceId: string,
    @CurrentUser() user: any,
  ) {
    return this.studiesService.getStudyMetadata(
      sourceId,
      imageSetId,
      user.id,
      user.role,
    );
  }

  @Get(':imageSetId')
  getImageSet(
    @Param('imageSetId') imageSetId: string,
    @Query('sourceId') sourceId: string,
    @CurrentUser() user: any,
  ) {
    return this.studiesService.getImageSet(
      sourceId,
      imageSetId,
      user.id,
      user.role,
    );
  }
}
