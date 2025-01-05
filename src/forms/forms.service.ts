import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { version } from 'node:os';
import { AppointmentDocument, FormTemplateDocument } from 'src/database/schema';

@Injectable()
export class FormsService {
  constructor(
    @InjectModel('form-templates')
    private formTemplateModel: Model<FormTemplateDocument>,
    @InjectModel('appointments')
    private appointmentModel: Model<AppointmentDocument>,
  ) {}

  async getRootFormTemplates() {
    const forms = await this.formTemplateModel.find({
      rootFormTemplateId: null,
      parentFormTemplateId: null,
    });

    return forms;
  }

  async getFormTemplateById(formTemplateId: string) {
    const form = await this.formTemplateModel.findOne({ id: formTemplateId });

    if (!form) {
      throw new NotFoundException(`form with id ${formTemplateId} not found`);
    }

    return form;
  }

  async getFormTemplatesForAppointment(appointmentId: string) {
    const appointment = await this.appointmentModel.findOne({
      id: appointmentId,
    });

    if (!appointment) {
      throw new NotFoundException(
        `appointment with id ${appointmentId} not found`,
      );
    }

    // root form templates
    const forms = await this.formTemplateModel.find({
      rootFormTemplateId: null,
      parentFormTemplateId: null,
      versionNumber: 0,
      services: {
        $in: appointment.services,
      },
    });

    // replace root forms with the most recent version if it exists
    let i = 0;
    for (const f of forms) {
      const latestFormVersion = await this.getLatestFormTemplateByArtist(
        appointment.artistId,
        f.id,
      );

      if (latestFormVersion) {
        forms[i] = latestFormVersion;
      }

      i++;
    }

    return forms;
  }

  private async getLatestFormTemplateByArtist(
    artistId: string,
    rootFormTemplateId: string,
  ) {
    const form = await this.formTemplateModel
      .findOne({
        artistId,
        rootFormTemplateId,
      })
      .sort({ versionNumber: -1 });

    return form;
  }

  // work in progress
  async createNewFormFromExistingTemplate(
    artistId: string,
    formTemplateId: string,
  ) {
    const originalForm = await this.formTemplateModel.findOne({
      id: formTemplateId,
    });

    if (!originalForm) {
      throw new NotFoundException(
        `form template with id ${formTemplateId} not found`,
      );
    }

    if (originalForm.artistId && artistId !== originalForm.artistId) {
      throw new ForbiddenException(
        `You are not allowed to modify this form. You can only modify forms you created or forms from the base template`,
      );
    }

    // get latest form-template-> this becomes the parent template - GetLatestFormTemplate(artistId, rootFormTemplateId)
    const parentTemplate = await this.formTemplateModel
      .findOne({
        rootFormTemplateId: originalForm.id,
        artistId: artistId,
      })
      .sort({ versionNumber: -1 });

    // if parentTemplate exists, insert new Template

    let templateDocBody: Partial<FormTemplateDocument>;

    if (parentTemplate) {
      const versionNumber = parentTemplate.versionNumber + 1;
      const id = `${parentTemplate.rootFormTemplateId}-${artistId}-${versionNumber}`;
      templateDocBody = {
        id,
        rootFormTemplateId: parentTemplate.rootFormTemplateId,
        parentFormTemplateId: parentTemplate.id,
        artistId,
        versionNumber,
      };
    } else {
      const versionNumber = 1;
      const id = `${parentTemplate.rootFormTemplateId}-${artistId}-${versionNumber}`;
      templateDocBody = {
        id,
        rootFormTemplateId: originalForm.id,
        parentFormTemplateId: originalForm.id,
        artistId,
        versionNumber,
      };
    }

    const newTemplate = await this.formTemplateModel.create(templateDocBody);

    return newTemplate;
  }
}
