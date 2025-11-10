import { Controller, Get, Post, Delete, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { GdprService } from './gdpr.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('gdpr')
@UseGuards(JwtAuthGuard)
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  @Get('export')
  async exportUserData(@CurrentUser() user: any, @Res() res: Response) {
    const data = await this.gdprService.exportUserData(user.id);

    // Set headers for JSON download
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="user_data_${user.id}_${Date.now()}.json"`,
    );
    res.setHeader('Content-Type', 'application/json');

    return res.json(data);
  }

  @Delete('delete')
  async deleteUserData(@CurrentUser() user: any) {
    return this.gdprService.deleteUserData(user.id);
  }

  @Post('consent')
  async updateConsent(
    @CurrentUser() user: any,
    @Body('consent') consent: boolean,
  ) {
    return this.gdprService.updateConsent(user.id, consent);
  }

  @Get('consent')
  async getConsentStatus(@CurrentUser() user: any) {
    return this.gdprService.getConsentStatus(user.id);
  }

  @Post('data-retention')
  async updateDataRetention(
    @CurrentUser() user: any,
    @Body('days') days: number,
  ) {
    if (!days || days < 30) {
      throw new Error('Data retention period must be at least 30 days');
    }
    return this.gdprService.updateDataRetention(user.id, days);
  }
}
