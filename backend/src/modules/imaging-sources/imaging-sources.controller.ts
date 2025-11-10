import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ImagingSourcesService } from './imaging-sources.service';
import { CreateImagingSourceDto } from './dto/create-imaging-source.dto';
import { UpdateImagingSourceDto } from './dto/update-imaging-source.dto';
import { GrantAccessDto } from './dto/grant-access.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('imaging-sources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImagingSourcesController {
  constructor(private readonly imagingSourcesService: ImagingSourcesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SOURCE_MANAGER)
  create(
    @Body() createDto: CreateImagingSourceDto,
    @CurrentUser() user: any,
  ) {
    return this.imagingSourcesService.create(createDto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.imagingSourcesService.findAll(user.id, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.imagingSourcesService.findOne(id, user.id, user.role);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.SOURCE_MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateImagingSourceDto,
    @CurrentUser() user: any,
  ) {
    return this.imagingSourcesService.update(id, updateDto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SOURCE_MANAGER)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.imagingSourcesService.remove(id, user.id, user.role);
  }

  @Post(':id/grant')
  @Roles(Role.ADMIN, Role.SOURCE_MANAGER)
  grantAccess(
    @Param('id') id: string,
    @Body() grantDto: GrantAccessDto,
    @CurrentUser() user: any,
  ) {
    return this.imagingSourcesService.grantAccess(
      id,
      grantDto.userId,
      user.id,
      user.role,
    );
  }

  @Delete(':id/grant/:userId')
  @Roles(Role.ADMIN, Role.SOURCE_MANAGER)
  revokeAccess(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    return this.imagingSourcesService.revokeAccess(id, userId, user.id, user.role);
  }
}
