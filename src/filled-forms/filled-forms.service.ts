import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AppointmentDocument,
  FilledFormDocument,
  FormTemplateDocument,
} from 'src/database/schema';

@Injectable()
export class FilledFormsService {
  constructor(
    @InjectModel('filled-forms')
    private filledFormModel: Model<FilledFormDocument>,
    @InjectModel('form-templates')
    private formTemplateModel: Model<FormTemplateDocument>,
    @InjectModel('appointments')
    private appointmentModel: Model<AppointmentDocument>,
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

    const formTemplate = await this.formTemplateModel.findOne({
      id: formTemplateId,
    });

    if (!formTemplate) {
      throw new NotFoundException(
        `form template with id ${formTemplateId} not found`,
      );
    }

    // submit the form
    const filledForm = await this.filledFormModel.create({
      appointmentId: appointment.id,
      clientId: customerId,
      formTemplateId: formTemplate.id,
      data: formData,
    });

    // TODO- check if all forms have been filled and update 'allFormsCompleted' asynchronously??

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
}
