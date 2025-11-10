import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { SearchPatientsDto } from './dto/search-patients.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  searchPatients(@Query() dto: SearchPatientsDto, @CurrentUser() user: any) {
    return this.patientsService.searchPatients(dto, user.id, user.role);
  }

  @Get(':patientId/studies')
  getPatientStudies(
    @Param('patientId') patientId: string,
    @Query('sourceId') sourceId: string,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.getPatientStudies(
      sourceId,
      patientId,
      user.id,
      user.role,
    );
  }
}
