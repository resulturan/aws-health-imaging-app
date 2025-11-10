import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ImagingSourcesModule } from './modules/imaging-sources/imaging-sources.module';
import { PatientsModule } from './modules/patients/patients.module';
import { StudiesModule } from './modules/studies/studies.module';
import { DicomProxyModule } from './modules/dicom-proxy/dicom-proxy.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { CacheModule } from './modules/cache/cache.module';
import { ExportModule } from './modules/export/export.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { GdprModule } from './modules/gdpr/gdpr.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    CacheModule,
    CredentialsModule,
    AuditModule,
    GdprModule,
    AuthModule,
    UsersModule,
    ImagingSourcesModule,
    PatientsModule,
    StudiesModule,
    DicomProxyModule,
    ExportModule,
    NotificationsModule,
  ],
})
export class AppModule {}
