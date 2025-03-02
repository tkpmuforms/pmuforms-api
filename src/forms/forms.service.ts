import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppointmentDocument, FormTemplateDocument } from 'src/database/schema';
import { NewFormVersionDto, UpdateSectionsDto } from './dto';
import { paginationMetaGenerator } from 'src/utils';
import { createHash } from 'node:crypto';

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

    // remove skipped sections from response
    const sectionsNotSkipped = form.sections.filter((section) => !section.skip);
    form.sections = sectionsNotSkipped;

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
      "sections.skip": { $eq: null }
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

    const metadata = paginationMetaGenerator(forms.length, 1, forms.length);

    return { metadata, forms };
  }

  private async getLatestFormTemplateByArtist(
    artistId: string,
    rootFormTemplateId: string,
  ) {
    const form = await this.formTemplateModel
      .findOne({
        artistId,
        rootFormTemplateId,
        "sections.skip": { $eq: null }
      })
      .sort({ versionNumber: -1 });

    return form;
  }

  private hashData(data: any[], isMongoData?: boolean) {
    const hash = createHash('sha256');

    let cleanedData: any[];
    if (isMongoData) {
      cleanedData = data.map((obj) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = obj.toObject();
        return rest;
      });
    } else {
      cleanedData = data;
    }

    const sortedData = cleanedData.map((d) =>
      Object.keys(d)
        .sort() // Sort keys alphabetically
        .reduce((acc, key) => {
          acc[key] = d[key]; // Rebuild object with sorted keys
          return acc;
        }, {}),
    );

    hash.update(JSON.stringify(sortedData));
    return hash.digest('hex');
  }

  async createNewFormFromExistingTemplate(
    artistId: string,
    formTemplateId: string,
    dto: NewFormVersionDto,
  ) {
    const formToMod = await this.formTemplateModel.findOne({
      id: formTemplateId,
    });

    if (!formToMod) {
      throw new NotFoundException(
        `form template with id ${formTemplateId} not found`,
      );
    }

    // formToMod may not be the latest version
    let latestFormToModTemplateVersion = await this.formTemplateModel
      .findOne({
        rootFormTemplateId: formToMod.rootFormTemplateId ?? formToMod.id,
        artistId: artistId,
      })
      .sort({ versionNumber: -1 });

    if (!latestFormToModTemplateVersion) {
      latestFormToModTemplateVersion = formToMod;
    }

    const previousSectionData = this.hashData(
      latestFormToModTemplateVersion.sections,
      true,
    );
    const newSectionData = this.hashData(dto.sections);

    if (previousSectionData === newSectionData) {
      throw new BadRequestException('no changes detected');
    }

    const versionNumber = latestFormToModTemplateVersion.versionNumber + 1;

    let newTemplateDocBody: Partial<FormTemplateDocument> = {
      versionNumber,
      title: latestFormToModTemplateVersion.title,
      sections: dto.sections,
      artistId,
    };

    if (latestFormToModTemplateVersion.versionNumber === 0) {
      // this is a root template form
      const id = `${latestFormToModTemplateVersion.id}-${artistId}-${versionNumber}`;
      newTemplateDocBody = {
        ...latestFormToModTemplateVersion,
        ...newTemplateDocBody,
        id,
        parentFormTemplateId: latestFormToModTemplateVersion.id,
        rootFormTemplateId: latestFormToModTemplateVersion.id,
      };
    } else {
      if (
        latestFormToModTemplateVersion.artistId &&
        artistId !== latestFormToModTemplateVersion.artistId
      ) {
        throw new ForbiddenException(
          `You are not allowed to modify this form. You can only modify forms you created or forms from the base template`,
        );
      }
      const id = `${latestFormToModTemplateVersion.rootFormTemplateId}-${artistId}-${versionNumber}`;
      newTemplateDocBody = {
        ...latestFormToModTemplateVersion,
        ...newTemplateDocBody,
        id,
        rootFormTemplateId: latestFormToModTemplateVersion.rootFormTemplateId,
        parentFormTemplateId: latestFormToModTemplateVersion.id,
      };
    }

    const newFormTemplate =
      await this.formTemplateModel.create(newTemplateDocBody);

    return newFormTemplate;
  }

  async updateServicesForFormTemplate(
    formTemplateId: string,
    artistId: string,
    services: number[],
  ) {
    const formTemplate = await this.formTemplateModel.findOne({
      id: formTemplateId,
      artistId,
    });

    if (!formTemplate) {
      throw new NotFoundException(
        `formTemplate with id ${formTemplateId} not found`,
      );
    }

    // removing duplicates from services array
    const servicesSet = new Set(services);
    const formServices = Array.from(servicesSet);

    formTemplate.services = formServices;

    await formTemplate.save();

    return formTemplate;
  }

  async updateFormTemplateSections(
    formTemplateId: string,
    artistId: string,
    dto: UpdateSectionsDto,
  ) {
    /*
     * Updates section details without creating a new version
     * Basically used to add skip flag to the section that the artist wants to remove
     */
    const formTemplate = await this.formTemplateModel.findOne({
      id: formTemplateId,
      artistId,
    });

    if (!formTemplate) {
      throw new NotFoundException(
        `formTemplate with id ${formTemplateId} not found`,
      );
    }

    formTemplate.sections = dto.sections;

    await formTemplate.save();

    return formTemplate;
  }
}
