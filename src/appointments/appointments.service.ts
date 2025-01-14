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
  CustomerDocument,
  RelationshipDocument,
  UserDocument,
} from 'src/database/schema';
import { PaginationParamsDto } from './dto';
import { paginationMetaGenerator } from 'src/utils';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel('appointments')
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel('relationships')
    private relationshipModel: Model<RelationshipDocument>,
    @InjectModel('users')
    private userModel: Model<UserDocument>,
    @InjectModel('customers')
    private customerModel: Model<CustomerDocument>,
  ) {}

  async getAllCustomerAppointments(
    customerId: string,
    options: PaginationParamsDto,
  ) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const queryObject: RootFilterQuery<AppointmentDocument> = {
      customerId,
      deleted: false,
    };

    const docCount = await this.appointmentModel.countDocuments(queryObject);

    const metadata = paginationMetaGenerator(docCount, page, limit);

    const appointments = await this.appointmentModel
      .find(queryObject)
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

    if (appointmentDate < new Date()) {
      throw new BadRequestException(`Appointment date must be after today`);
    }

    const appointment = this.appointmentModel.create({
      date: appointmentDate,
      artistId,
      customerId,
      services,
      id: randomUUID(),
    });

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
    const appointment = await this.appointmentModel.findOne({
      id: appointmentId,
    });

    return appointment;
  }

  async signAppointment(
    artistId: string,
    appointmentId: string,
    signatureUrl: string,
  ) {
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

    appointment.signed = true;
    appointment.signature_url = signatureUrl;

    await appointment.save();

    return appointment;
  }
}
