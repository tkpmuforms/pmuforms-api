import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { FormsService } from 'src/forms/forms.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, FormsService],
})
export class AppointmentsModule {}
