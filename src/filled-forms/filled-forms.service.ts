import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AppointmentDocument,
  FilledFormDocument,
  FormTemplateDocument,
  UserDocument,
} from 'src/database/schema';
import {
  // FilledFormEvent,
  FilledFormSubmittedEvent,
} from 'src/filled-forms/filled-forms.event';
import { FormsService } from 'src/forms/forms.service';
import { FilledFormStatus } from 'src/enums';
import { randomUUID } from 'node:crypto';
import { paginationMetaGenerator } from 'src/utils';
import { UtilsService } from 'src/utils/utils.service';

@Injectable()
export class FilledFormsService {
  constructor(
    @InjectModel('filled-forms')
    private filledFormModel: Model<FilledFormDocument>,
    @InjectModel('form-templates')
    private formTemplateModel: Model<FormTemplateDocument>,
    @InjectModel('appointments')
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel('users')
    private artistModel: Model<UserDocument>,
    private eventEmitter: EventEmitter2,
    private formsService: FormsService,
    private utilsService: UtilsService,
  ) {}

  async submitForm(
    appointmentId: string,
    customerId: string,
    formTemplateId: string,
    formData: { [key: string]: any },
  ) {
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

    const { forms: formsForAppointment } =
      await this.formsService.getFormTemplatesForAppointment(appointment.id);

    const formIsForAppointment = formsForAppointment.find(
      (template) => template.id === formTemplate.id,
    );

    if (!formIsForAppointment) {
      throw new BadRequestException(
        `form template with id ${formTemplate.id} is not among the forms for this appointment`,
      );
    }

    let filledForm: FilledFormDocument;

    filledForm = await this.filledFormModel.findOne({
      appointmentId: appointment.id,
      clientId: customerId,
      formTemplateId: formTemplate.id,
    });

    if (filledForm) {
      // form has already been filled by the customer for this appointment
      // update form data
      filledForm.data = formData;
    } else {
      // submit the form
      filledForm = new this.filledFormModel({
        id: randomUUID(),
        appointmentId: appointment.id,
        clientId: customerId,
        formTemplateId: formTemplate.id,
        data: formData,
        title: formTemplate.title,
      });
    }

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

    // checks if customer has submitted all forms for this appointment
    this.eventEmitter.emit(
      'filled-form.submitted',
      new FilledFormSubmittedEvent({ appointment, formTemplate }),
    );

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

    // if (appointment.artistId !== userId && appointment.customerId !== userId) {
    //   throw new ForbiddenException(
    //     `You are not allowed to perform this action`,
    //   );
    // }

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

    if (appointment.artistId !== userId && appointment.customerId !== userId) {
      throw new ForbiddenException(
        `You are not allowed to perform this action`,
      );
    }

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
  @OnEvent('filled-form.submitted', { async: true })
  async handleFilledFormSubmittedEvent(event: FilledFormSubmittedEvent) {
    const { appointment } = event.payload;

    // check all forms for this appointment
    const { forms } = await this.formsService.getFormTemplatesForAppointment(
      appointment.id,
    );

    // check forms submitted of this appointment
    const submittedForms = await this.filledFormModel.find({
      appointmentId: appointment.id,
    });

    if (submittedForms.length >= forms.length) {
      // check all form status of every submitted form
      let completedStatus = true;

      for (const submittedForm of submittedForms) {
        completedStatus =
          completedStatus &&
          submittedForm.status === FilledFormStatus.COMPLETED;
        if (!completedStatus) {
          // early return
          break;
        }
      }

      appointment.allFormsCompleted = completedStatus;
      await appointment.save();
    }
    if (appointment.allFormsCompleted) {
      // notify user that all forms have been completed
      await this.notifyArtistAboutFormCompletion(appointment);
    }
  }

  private async notifyArtistAboutFormCompletion(
    appointmentDoc: AppointmentDocument,
  ) {
    //
    const artist = await this.artistModel.findOne({
      userId: appointmentDoc.artistId,
    });

    if (!artist) {
      return;
    }

    await this.utilsService.sendPushNotification({
      title: 'New Appointment Form Submitted!',
      body: `Your client has completed their appointment forms for their upcoming service. Review their details and get ready to create something amazing!`,
      fcmToken: artist.fcmToken,
    });

    await this.utilsService.sendEmail({
      to: artist.email,
      subject: 'New Appointment Form Submitted!',
      message: `
        <p>Great news! Your client has completed their appointment forms for their upcoming service.</p>
        <p>Review their details and get ready to create something amazing!</p>
        <p>&nbsp;</p>
        <p>[View Appointment Details] </p>
      `,
    });
  }
}
