import {
  Controller,
  Delete,
  Body,
  Post,
  Param,
  Get,
  Query,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { BookAnApppointmentDto, PaginationParamsDto } from './dto';
import { GetUser, Roles } from 'src/auth/decorator';
import { UserRole } from 'src/enums';
import { CustomerDocument, UserDocument } from 'src/database/schema';

@Controller('api/appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Roles(UserRole.CUSTOMER)
  @Get('/customer')
  async getAllCustomerAppointments(
    @GetUser() customer: CustomerDocument,
    @Query() options: PaginationParamsDto,
  ) {
    const { metadata, appointments } =
      await this.appointmentsService.getAllCustomerAppointments(
        customer.id,
        options,
      );

    return { metadata, appointments };
  }

  @Roles(UserRole.ARTIST)
  @Get('/artist')
  async getAllArtistAppointments(
    @GetUser() artist: UserDocument,
    @Query() options: PaginationParamsDto,
  ) {
    const { metadata, appointments } =
      await this.appointmentsService.getAllArtistAppointments(
        artist.userId,
        options,
      );

    return { metadata, appointments };
  }

  @Roles(UserRole.CUSTOMER)
  @Post('/book-appointment')
  async bookAppointment(
    @Body() dto: BookAnApppointmentDto,
    @GetUser() customer: CustomerDocument,
  ) {
    const appointment = await this.appointmentsService.bookAppointment(
      dto.appointmentDate,
      dto.artistId,
      customer.id,
      dto.services,
    );

    return { appointment };
  }

  @Roles(UserRole.ARTIST)
  @Get('/artist/one-customer/:customerId')
  async getCustomersAppointments(
    @GetUser() artist: UserDocument,
    @Param('customerId') customerId: string,
    @Query() options: PaginationParamsDto,
  ) {
    const { metadata, appointments } =
      await this.appointmentsService.getCustomersAppointments(
        artist.userId,
        customerId,
        options,
      );

    return { metadata, appointments };
  }

  @Get('/:appointmentId')
  async getAppointment(@Param('appointmentId') appointmentId: string) {
    const appointment =
      await this.appointmentsService.getAppointment(appointmentId);

    return { appointment };
  }

  @Delete('/:appointmentId')
  async deleteAppointment(
    @GetUser() customer: CustomerDocument,
    @Param('appointmentId') appointmentId: string,
  ) {
    const appointment = await this.appointmentsService.deleteAppointment(
      customer.id,
      appointmentId,
    );

    return { message: 'appointment deleted', appointment };
  }
}
