import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { HealthcheckModule } from './healthcheck/healthcheck.module';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { ServicesModule } from './services/services.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    AuthModule,
    HealthcheckModule,
    AppConfigModule,
    DatabaseModule,
    ServicesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
