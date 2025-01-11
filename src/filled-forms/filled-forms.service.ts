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
} from 'src/database/schema';
import {
  // FilledFormEvent,
  FilledFormSubmittedEvent,
} from 'src/filled-forms/filled-forms.event';
import { FormsService } from 'src/forms/forms.service';

@Injectable()
export class FilledFormsService {
  constructor(
    @InjectModel('filled-forms')
    private filledFormModel: Model<FilledFormDocument>,
    @InjectModel('form-templates')
    private formTemplateModel: Model<FormTemplateDocument>,
    @InjectModel('appointments')
    private appointmentModel: Model<AppointmentDocument>,
    private eventEmitter: EventEmitter2,
    private formsService: FormsService,
  ) {}

  async submitForm(
    appointmentId: string,
    customerId: string,
    formTemplateId: string,
    formData: { [key: string]: any },
  ) {
    const appointment = await this.appointmentModel.findOne({
      id: appointmentId,
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

    const formTemplate = await this.formTemplateModel.findOne({
      id: formTemplateId,
    });

    if (!formTemplate) {
      throw new NotFoundException(
        `form template with id ${formTemplateId} not found`,
      );
    }

    const alreadyFilledForm = await this.filledFormModel.findOne({
      appointmentId: appointment.id,
      clientId: customerId,
      formTemplateId: formTemplate.id,
    });

    if (alreadyFilledForm) {
      throw new BadRequestException(
        `You have already filled this form for this appointment`,
      );
    }

    const formsForAppointment =
      await this.formsService.getFormTemplatesForAppointment(appointment.id);

    const formIsForAppointment = formsForAppointment.find(
      (template) => template.id === formTemplate.id,
    );

    if (!formIsForAppointment) {
      throw new BadRequestException(
        `form template with id ${formTemplate.id} is not among the forms for this appointment`,
      );
    }

    // submit the form
    const filledForm = await this.filledFormModel.create({
      appointmentId: appointment.id,
      clientId: customerId,
      formTemplateId: formTemplate.id,
      data: formData,
    });

    // checks if customer has submitted all forms for this appointment
    this.eventEmitter.emit(
      'filled-form.submitted',
      new FilledFormSubmittedEvent({ appointment, formTemplate }),
    );

    return filledForm;
  }

  async getFilledForms(artistId: string, appointmentId: string) {
    const appointment = await this.appointmentModel.findOne({
      id: appointmentId,
    });

    if (!appointment) {
      throw new NotFoundException(
        `appointment with id ${appointmentId} not found`,
      );
    }

    if (appointment.artistId !== artistId) {
      throw new ForbiddenException(
        `You are not allowed to perform this action`,
      );
    }

    const filledForms = await this.filledFormModel.find({ appointmentId });

    return filledForms;
  }

  /*
    This function checks if all forms are filled and updates the appointment doc if true
  */
  @OnEvent('filled-form.submitted', { async: true })
  async handleFilledFormSubmittedEvent(event: FilledFormSubmittedEvent) {
    const { appointment } = event.payload;

    // check all forms for this appointment
    const forms = await this.formsService.getFormTemplatesForAppointment(
      appointment.id,
    );

    // check forms submitted of this appointment
    const submittedForms = await this.filledFormModel.find({
      appointmentId: appointment.id,
    });

    if (forms.length === submittedForms.length) {
      appointment.allFormsCompleted = true;
      await appointment.save();
    }
  }
}
