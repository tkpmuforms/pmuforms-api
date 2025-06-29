import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AppointmentDocument,
  FilledFormDocument,
  FormTemplateDocument,
} from 'src/database/schema';

import { FilledFormStatus } from 'src/enums';
import { paginationMetaGenerator } from 'src/utils';
import { UtilsService } from 'src/utils/utils.service';
import { randomUUID } from 'node:crypto';

@Injectable()
export class FilledFormsService {
  constructor(
    @InjectModel('filled-forms')
    private filledFormModel: Model<FilledFormDocument>,
    @InjectModel('form-templates')
    private formTemplateModel: Model<FormTemplateDocument>,
    @InjectModel('appointments')
    private appointmentModel: Model<AppointmentDocument>,
    private utilsService: UtilsService,
  ) {}

  private checkAppointmentAuthorization(
    userId: string,
    appointment: AppointmentDocument,
  ) {
    console.log(JSON.stringify(appointment));
    
    // if (appointment.artistId !== userId && appointment.customerId !== userId) {
    //   throw new ForbiddenException(
    //     `You are not allowed to perform this action`,
    //   );
    // }
  }

  async submitForm(
    appointmentId: string,
    customerIdd: string,
    formTemplateId: string,
    formData: { [key: string]: any },
    options?: { customerId?: string },
  ) {
    const customerId = options?.customerId ?? customerIdd;
    const appointment = await this.appointmentModel.findOne({
      id: appointmentId,
      customerId,
    });

    if (!appointment) {
      throw new NotFoundException(
        `appointment with id ${appointmentId} not found`,
      );
    }

    if (customerId !== appointment.customerId) {
      throw new ForbiddenException(
        'You are not allowed to perform this action',
      );
    }

    if (appointment.allFormsCompleted) {
      throw new BadRequestException(
        `All forms have been completed for this appointment`,
      );
    }

    if (appointment.signed) {
      throw new BadRequestException(`Appointment has already been signed`);
    }

    const formTemplate = await this.formTemplateModel.findOne({
      id: formTemplateId,
    });

    if (!formTemplate) {
      throw new NotFoundException(
        `form template with id ${formTemplateId} not found`,
      );
    }

    let filledForm = await this.filledFormModel.findOne({
      appointmentId: appointment.id,
      clientId: customerId,
      formTemplateId: formTemplate.id,
    });

    if (!filledForm) {
      filledForm = new this.filledFormModel({
        id: randomUUID(),
        appointmentId: appointment.id,
        clientId: customerId,
        formTemplateId: formTemplate.id,
        title: formTemplate.title,
        status: FilledFormStatus.INCOMPLETE,
      });
    }

    filledForm.data = formData;
    // check if all required fields are completed
    const requiredFields = new Set<string>();

    for (const section of formTemplate.sections) {
      for (const q of section.data) {
        if (q.required) {
          requiredFields.add(q.id);
        }
      }
    }

    for (const key of Object.keys(formData)) {
      if (key && formData[key] !== null) {
        requiredFields.delete(key);
      }
    }

    // user did not fill any details
    filledForm.isSkipped = Object.keys(formData).length === 0;

    if (requiredFields.size === 0) {
      // all required fields filled
      filledForm.status = FilledFormStatus.COMPLETED;
    } else {
      filledForm.status = FilledFormStatus.INCOMPLETE;
    }

    await filledForm.save();

    await this.handleFilledFormSubmittedEvent({ appointment });

    return filledForm;
  }

  async getFilledFormsForAppointment(userId: string, appointmentId: string) {
    const appointment = await this.appointmentModel.findOne({
      id: appointmentId,
    });

    if (!appointment) {
      throw new NotFoundException(
        `appointment with id ${appointmentId} not found`,
      );
    }

    this.checkAppointmentAuthorization(userId, appointment);

    const filledForms = await this.filledFormModel
      .find({ appointmentId })
      .populate('formTemplate');

    const metadata = paginationMetaGenerator(
      filledForms.length,
      1,
      filledForms.length,
    );

    return { metadata, filledForms };
  }

  async getFilledFormForAppointmentByFormTemplateId(
    userId: string,
    appointmentId: string,
    formTemplateId: string,
  ) {
    const appointment = await this.appointmentModel.findOne({
      id: appointmentId,
    });

    if (!appointment) {
      throw new NotFoundException(
        `appointment with id ${appointmentId} not found`,
      );
    }

    this.checkAppointmentAuthorization(userId, appointment);

    const filledForm = await this.filledFormModel
      .findOne({
        appointmentId,
        formTemplateId,
      })
      .populate('formTemplate');

    return filledForm;
  }

  /*
    This function checks if all forms are filled and updates the appointment doc if true
  */
  private async handleFilledFormSubmittedEvent(payload: {
    appointment: AppointmentDocument;
  }) {
    try {
      const { appointment } = payload;

      // check forms submitted of this appointment
      const filledForms = await this.filledFormModel.find({
        appointmentId: appointment.id,
      });

      // check all form status of every submitted form
      let completedStatus = true;

      for (const filledForm of filledForms) {
        completedStatus =
          completedStatus && filledForm.status === FilledFormStatus.COMPLETED;
        if (!completedStatus) {
          // early return
          break;
        }
      }

      appointment.allFormsCompleted = completedStatus;
      await appointment.save();

      if (appointment.allFormsCompleted) {
        // notify user that all forms have been completed
        await this.notifyArtistAboutFormCompletion(appointment);
      }
    } catch {}
  }

  private async notifyArtistAboutFormCompletion(
    appointmentDoc: AppointmentDocument,
  ) {
    await appointmentDoc.populate('artist');
    await appointmentDoc.populate('customer');
    await appointmentDoc.populate('serviceDetails');

    await this.utilsService.sendPushNotification({
      title: 'New Appointment Form Submitted!',
      body: `Your client has completed their appointment forms for their upcoming service. Review their details and get ready to create something amazing!`,
      fcmToken: appointmentDoc.artist.fcmToken,
    });

    const [firstName, lastName] = appointmentDoc.customer.name.split(' ');

    const customerName = `${firstName} ${lastName?.slice(0, 1) || ''}.`;

    let servicesList = '';
    for (const service of appointmentDoc.serviceDetails) {
      servicesList += ` <li>${service.service}</li>`;
    }

    await this.utilsService.sendEmail({
      to: appointmentDoc.artist.email,
      subject: 'New Appointment Form Submitted!',
      message: `<body>
        <p>Great news! ${customerName} has completed their appointment forms for their upcoming service.</p>
        <p>Review their details and get ready to create something amazing!</p>
        <div>
          <p><b>Services being done</b></p>
          <ul> ${servicesList}</ul>
        </div>
      </body>`,
    });
  }
}
