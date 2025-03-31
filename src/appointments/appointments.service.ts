import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery } from 'mongoose';
import {
  AppointmentDocument,
  FilledFormDocument,
  RelationshipDocument,
  UserDocument,
} from 'src/database/schema';
import { EditAppointmentDto, PaginationParamsDto } from './dto';
import { paginationMetaGenerator } from 'src/utils';
import { DateTime } from 'luxon';
import { FormsService } from 'src/forms/forms.service';
import { FilledFormStatus } from 'src/enums';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel('appointments')
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel('relationships')
    private relationshipModel: Model<RelationshipDocument>,
    @InjectModel('users')
    private userModel: Model<UserDocument>,
    private readonly formsService: FormsService,
    @InjectModel('filled-forms')
    private filledFormModel: Model<FilledFormDocument>,
  ) {}

  async getAllCustomerAppointmentsInAuthContext(
    customerId: string,
    artistId: string,
    options: PaginationParamsDto,
  ) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const queryObject: RootFilterQuery<AppointmentDocument> = {
      customerId,
      artistId,
      deleted: false,
    };

    const docCount = await this.appointmentModel.countDocuments(queryObject);

    const metadata = paginationMetaGenerator(docCount, page, limit);

    const appointments = await this.appointmentModel
      .find(queryObject)
      .populate('filledForms', 'id status')
      .populate('serviceDetails', 'id service')
      .sort({ appointmentDate: 'descending' })
      .skip(skip)
      .limit(limit);
    return { metadata, appointments };
  }

  async getAllArtistAppointments(
    artistId: string,
    options: PaginationParamsDto,
  ) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const queryObject: RootFilterQuery<AppointmentDocument> = {
      artistId,
      deleted: false,
    };

    const docCount = await this.appointmentModel.countDocuments(queryObject);

    const metadata = paginationMetaGenerator(docCount, page, limit);
    const appointments = await this.appointmentModel
      .find(queryObject)
      .populate('filledForms', 'id status')
      .populate('serviceDetails', 'id service')
      .sort({ appointmentDate: 'descending' })
      .skip(skip)
      .limit(limit);
    return { metadata, appointments };
  }

  async bookAppointment(
    appointmentDate: Date,
    artistId: string,
    customerId: string,
    services: number[],
  ) {
    // check if artist and customer have relationship
    const relationship = await this.relationshipModel.findOne({
      customerId,
      artistId,
    });

    if (!relationship) {
      throw new ForbiddenException(
        `Artist with id ${artistId} and customer with id ${customerId} have no relationship`,
      );
    }

    // check if artist offers selected services
    const artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }

    const artistServices = artist.services ?? [];

    const artistServiceIds = artistServices.map((service) => service.id);

    const servicesNotOffered = services.filter(
      (serviceId) => !artistServiceIds.includes(serviceId),
    );

    if (servicesNotOffered.length) {
      throw new BadRequestException(
        `artist does not offer these services- ${servicesNotOffered}`,
      );
    }

    if (appointmentDate < DateTime.now().minus({ day: 1 }).toJSDate()) {
      throw new BadRequestException(`Appointment can not be before today`);
    }

    // removing duplicates from services array
    const servicesSet = new Set(services);
    const servicesForAppointment = Array.from(servicesSet);

    const appointment = await this.appointmentModel.create({
      date: appointmentDate,
      artistId,
      customerId,
      services: servicesForAppointment,
      id: randomUUID(),
    });

    const { forms } = await this.formsService.getFormTemplatesForAppointment(
      appointment.id,
    );

    appointment.formsToFillCount = forms.length;
    await appointment.save();

    return appointment;
  }

  async getCustomersAppointments(
    artistId: string,
    customerId: string,
    options: PaginationParamsDto,
  ) {
    const queryObject: RootFilterQuery<AppointmentDocument> = {
      artistId,
      customerId,
      deleted: false,
    };
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const docCount = await this.appointmentModel.countDocuments(queryObject);

    const metadata = paginationMetaGenerator(docCount, page, limit);
    const appointments = await this.appointmentModel
      .find(queryObject)
      .populate('serviceDetails', 'id service')
      .sort({ date: 'desc' })
      .skip(skip)
      .limit(limit);

    return { metadata, appointments };
  }

  async deleteAppointment(customerId: string, appointmentId: string) {
    const appointment = await this.appointmentModel.findOne({
      id: appointmentId,
    });

    if (!appointment) {
      throw new NotFoundException(
        `appointment with id ${appointmentId} not found`,
      );
    }

    if (appointment.customerId !== customerId) {
      throw new ForbiddenException(
        `You are not allowed to delete this appointment`,
      );
    }

    appointment.deleted = true;

    await appointment.save();

    return appointment;
  }

  async getAppointment(appointmentId: string) {
    const appointment = await this.appointmentModel
      .findOne({
        id: appointmentId,
      })
      .populate('filledForms', 'id status')
      .populate('serviceDetails', 'id service');

    return appointment;
  }

  async signAppointment(artistId: string, appointmentId: string) {
    const appointment = await this.appointmentModel.findOne({
      id: appointmentId,
    });

    if (!appointment) {
      throw new NotFoundException(
        `appointment with id ${appointmentId}  not found`,
      );
    }

    if (artistId !== appointment.artistId) {
      throw new ForbiddenException(
        `You are not allowed to perfrom this acction`,
      );
    }

    if (appointment.signed) {
      throw new BadRequestException(`Appointment has already been signed`);
    }

    if (!appointment.allFormsCompleted) {
      throw new BadRequestException(
        `All forms for this appointment have not been flilled`,
      );
    }

    const filledFormsForAppointment = await this.filledFormModel.find({
      appointmentId,
    });

    for (const i in filledFormsForAppointment) {
      filledFormsForAppointment[i].status = FilledFormStatus.SIGNED;
      await filledFormsForAppointment[i].save();
    }

    appointment.signed = true;

    await appointment.save();

    return appointment;
  }

  async editAppointment(
    userId: string,
    appointmentId: string,
    dto: EditAppointmentDto,
  ) {
    const { appointmentDate, services } = dto;
    const appointment = await this.appointmentModel.findOne({
      id: appointmentId,
    });

    if (!appointment) {
      throw new NotFoundException(
        `appointment with id ${appointmentId} not found `,
      );
    }

    if (appointment.artistId !== userId && appointment.customerId !== userId) {
      throw new ForbiddenException(
        `You are not allowed to perform this action`,
      );
    }

    if (appointment.signed) {
      throw new BadRequestException(`This appointment has already been signed`);
    }

    if (appointmentDate < new Date()) {
      throw new BadRequestException(`Appointment date must be after today`);
    }

    const artist = await this.userModel.findOne({
      userId: appointment.artistId,
    });

    const artistServices = artist.services ?? [];

    const artistServiceIds = artistServices.map((service) => service.id);

    const servicesNotOffered = services.filter(
      (serviceId) => !artistServiceIds.includes(serviceId),
    );

    if (servicesNotOffered.length) {
      throw new BadRequestException(
        `artist does not offer these services- ${servicesNotOffered}`,
      );
    }

    appointment.date = appointmentDate;
    appointment.services = services;

    await appointment.save();

    return appointment;
  }
}
