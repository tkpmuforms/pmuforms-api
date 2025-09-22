import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
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
import { UtilsService } from 'src/utils/utils.service';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private utilsService: UtilsService,
    private readonly formsService: FormsService,
    private readonly config: AppConfigService,
    @InjectModel('appointments')
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel('relationships')
    private relationshipModel: Model<RelationshipDocument>,
    @InjectModel('users')
    private userModel: Model<UserDocument>,
    @InjectModel('filled-forms')
    private filledFormModel: Model<FilledFormDocument>,
  ) {}

  private checkAppointmentAuthorization(
    userId: string,
    appointment: AppointmentDocument,
  ) {
    if (appointment.artistId !== userId && appointment.customerId !== userId) {
      throw new ForbiddenException(
        `You are not allowed to perform this action`,
      );
    }
  }

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
    customerIdd: string,
    services: number[],
    options?: { customerId?: string; notifyCustomer?: boolean },
  ) {
    // check if artist and customer have relationship
    const customerId = options?.customerId ?? customerIdd;
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

    // create filled forms for this appointment
    for (const i in forms) {
      const filledForm = new this.filledFormModel({
        id: randomUUID(),
        appointmentId: appointment.id,
        clientId: customerId,
        formTemplateId: forms[i].id,
        data: {},
        title: forms[i].title,
        status: FilledFormStatus.INCOMPLETE,
      });

      await filledForm.save();
    }

    appointment.formsToFillCount = forms.length;
    await appointment.save();

    if (options.notifyCustomer) {
      this.notifyCustomerOfAppointment(appointment).catch((error) =>
        this.logger.error(
          ':: Unable to notify customer of appointemnt ::',
          JSON.stringify({ error }),
        ),
      );
    }

    return appointment;
  }

  private async notifyCustomerOfAppointment(
    appointmentDoc: AppointmentDocument,
  ) {
    await appointmentDoc.populate('artist');
    await appointmentDoc.populate('customer');
    await appointmentDoc.populate('serviceDetails');

    const [firstName] = appointmentDoc.customer.name.split(' ');

    const DOMAIN = this.config.get('CLIENT_BASE_URL');

    const appointmentUrl = `${DOMAIN}/customer/forms/appointment/${appointmentDoc.id}`;

    const customerName = `${firstName || ''}`;

    let servicesList = '';
    for (const service of appointmentDoc.serviceDetails) {
      servicesList += ` <li>${service.service}</li>`;
    }

    if (!appointmentDoc.customer.email) {
      return;
    }

    await this.utilsService.sendEmail({
      to: appointmentDoc.customer.email,
      subject: 'Complete Your Appointment Forms for your next PMU Service',
      message: `<body>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:8px;box-shadow:0 6px 18px rgba(17,24,39,0.08);overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;">
              <!-- Greeting -->
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">
                Hi <strong>${customerName}</strong>,
              </p>

              <!-- Intro -->
              <p style="margin:0 0 18px 0;font-size:16px;line-height:1.5;">
                Your appointment has been scheduled! 🎉
              </p>

              <!-- Details card -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #eef2ff;border-radius:6px;padding:12px;background:#fbfcff;">
                <tr>
                  <td style="padding:6px 10px;">
                    <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Date:</strong> <span style="color:#111;">${appointmentDoc.date.toDateString()}</span></p>
                    <p style="margin:0;font-size:14px;color:#374151;"><strong>Services:</strong> <span style="color:#111;"></span></p>
                    <ul> ${servicesList}</ul>
                  </td>
                </tr>
              </table>

              <!-- Call to action -->
              <p style="margin:20px 0 22px 0;font-size:16px;line-height:1.5;color:#111;">
                To help us prepare and give you the best experience, we need you to complete a few quick forms. Please log in to your PMU Forms dashboard to fill them out before your appointment.
              </p>

              <p style="text-align:left;margin:0 0 26px 0;">
                <!-- Button -->
                <a href="${appointmentUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600;background:linear-gradient(180deg,#8e2d8e,#a654cd);color:#ffffff;box-shadow:0 6px 14px rgba(92,46,198,0.18);">
                  👉 Log in to Complete Forms
                </a>
              </p>

              <!-- Closing -->
              <p style="margin:0 0 6px 0;font-size:15px;color:#111;">
                Thank you, and we can’t wait to see you soon!
              </p>

              <p style="margin:0;font-size:15px;color:#6b7280;">
                Warmly,<br />
                <strong>The PMU Forms Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </body>`,
    });
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

  async deleteAppointment(userId: string, appointmentId: string) {
    const appointment = await this.appointmentModel.findOne({
      id: appointmentId,
      deleted: false,
    });

    if (!appointment) {
      throw new NotFoundException(
        `appointment with id ${appointmentId} not found`,
      );
    }

    this.checkAppointmentAuthorization(userId, appointment);

    if (appointment.signed) {
      throw new BadRequestException(`Appointment has already been signed`);
    }

    appointment.deleted = true;

    await appointment.save();

    return appointment;
  }

  async getAppointment(userId: string, appointmentId: string) {
    const appointment = await this.appointmentModel
      .findOne({
        id: appointmentId,
      })
      .populate('filledForms', 'id status')
      .populate('serviceDetails', 'id service');

    this.checkAppointmentAuthorization(userId, appointment);

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

    const filledFormsForAppointment = await this.filledFormModel.find({
      appointmentId,
    });

    for (const i in filledFormsForAppointment) {
      filledFormsForAppointment[i].status = FilledFormStatus.SIGNED;
      await filledFormsForAppointment[i].save();
    }

    appointment.signed = true;
    appointment.signature_url = signatureUrl;

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

    this.checkAppointmentAuthorization(userId, appointment);

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
