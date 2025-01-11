import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
import { AppointmentsModule } from './appointments/appointments.module';
import { CustomersModule } from './customers/customers.module';
import { UsersModule } from './users/users.module';
import { FormsModule } from './forms/forms.module';
import { FilledFormsModule } from './filled-forms/filled-forms.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    AuthModule,
    HealthcheckModule,
    AppConfigModule,
    DatabaseModule,
    ServicesModule,
    AppointmentsModule,
    CustomersModule,
    UsersModule,
    FormsModule,
    FilledFormsModule,
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
