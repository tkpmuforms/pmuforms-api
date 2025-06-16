import {
  Controller,
  Delete,
  Body,
  Post,
  Param,
  Get,
  Query,
  Patch,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import {
  BookAnApppointmentAsArtistDto,
  BookAnApppointmentAsCustomerDto,
  EditAppointmentDto,
  PaginationParamsDto,
  SignAppointmentDto,
} from './dto';
import { GetCurrentUserRole, GetUser, Roles } from 'src/auth/decorator';
import { UserRole } from 'src/enums';
import { CustomerDocument, UserDocument } from 'src/database/schema';
import { GetCustomerAuthContext } from 'src/auth/decorator/artist-context.decorator';
import { SubscriptionBlock } from 'src/subscription/decorators';

@SubscriptionBlock()
@Controller('api/appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Roles(UserRole.CUSTOMER)
  @Get('/customer')
  async getAllCustomerAppointmentsInAuthContext(
    @GetUser() customer: CustomerDocument,
    @GetCustomerAuthContext() artistId: string,
    @Query() options: PaginationParamsDto,
  ) {
    const { metadata, appointments } =
      await this.appointmentsService.getAllCustomerAppointmentsInAuthContext(
        customer.id,
        artistId,
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
  @Post('customer/book-appointment')
  async bookAppointmentAsCustomer(
    @Body() dto: BookAnApppointmentAsCustomerDto,
    @GetUser() customer: CustomerDocument,
    @Query('customerId') artistCustomerId: string,
  ) {
    const appointment = await this.appointmentsService.bookAppointment(
      dto.appointmentDate,
      dto.artistId,
      artistCustomerId ?? customer.id,
      dto.services,
    );

    return { appointment };
  }

  @Roles(UserRole.ARTIST)
  @Post('artist/book-appointment')
  async bookAppointmentAsArtist(
    @Body() dto: BookAnApppointmentAsArtistDto,
    @GetUser() artist: UserDocument,
  ) {
    const appointment = await this.appointmentsService.bookAppointment(
      dto.appointmentDate,
      artist.userId,
      dto.customerId,
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
  async getAppointment(
    @GetUser() user: CustomerDocument | UserDocument,
    @GetCurrentUserRole() userRole: UserRole,
    @Param('appointmentId') appointmentId: string,
  ) {
    // userId- pk in artist collection
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const userId: string = UserRole.ARTIST === userRole ? user.userId : user.id;
    const appointment = await this.appointmentsService.getAppointment(
      userId,
      appointmentId,
    );

    return { appointment };
  }

  @Delete('/:appointmentId')
  async deleteAppointment(
    @GetUser() user: CustomerDocument | UserDocument,
    @GetCurrentUserRole() userRole: UserRole,
    @Param('appointmentId') appointmentId: string,
  ) {
    // userId- pk in artist collection
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const userId: string = UserRole.ARTIST === userRole ? user.userId : user.id;
    const appointment = await this.appointmentsService.deleteAppointment(
      userId,
      appointmentId,
    );

    return { message: 'appointment deleted', appointment };
  }

  @Roles(UserRole.ARTIST)
  @Post('/:appointmentId/sign')
  async signAppointment(
    @GetUser() artist: UserDocument,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: SignAppointmentDto,
  ) {
    const appointment = await this.appointmentsService.signAppointment(
      artist.userId,
      appointmentId,
      dto.signatureUrl,
    );

    return { appointment };
  }

  @Patch('/:appointmentId')
  async editAppointment(
    @GetUser() user: CustomerDocument | UserDocument,
    @GetCurrentUserRole() userRole: UserRole,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: EditAppointmentDto,
  ) {
    // userId- pk in artist collection
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const userId: string = UserRole.ARTIST === userRole ? user.userId : user.id;

    const appointment = await this.appointmentsService.editAppointment(
      userId,
      appointmentId,
      dto,
    );

    return { appointment };
  }
}
