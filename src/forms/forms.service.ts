import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AppointmentDocument,
  FormTemplateDocument,
  Section,
  UserDocument,
} from 'src/database/schema';
import { NewFormVersionDto, UpdateCertainSectionsDto } from './dto';
import { paginationMetaGenerator } from 'src/utils';
import { createHash, randomUUID } from 'node:crypto';

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

  async getArtistFormTemplates(artist: UserDocument) {
    const artistServices: number[] = artist.services.map((s) => s.id);
    const forms = await this.formTemplateModel.find({
      services: { $in: artistServices },
      rootFormTemplateId: null,
      parentFormTemplateId: null,
      versionNumber: 0,
    });

    for (const i in forms) {
      const latestFormVersion = await this.getLatestFormTemplateByArtist(
        artist.userId,
        forms[i].id,
      );
      if (latestFormVersion) {
        forms[i] = latestFormVersion;
      }
    }

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
    let forms = await this.formTemplateModel.find({
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

      if (latestFormVersion && latestFormVersion?.services?.length) {
        forms[i] = latestFormVersion;
      } else {
        if (!!latestFormVersion) {
          //form version exist but has no service, do not replace with root form
          forms[i] = null;
        }

        //keep the root form since no version exists
      }

      i++;
    }

    forms = forms.filter((f) => f !== null);

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
      })
      .sort({ versionNumber: -1 });

    return form;
  }

  private hashData(data: Section[]) {
    const hash = createHash('sha256');

    const cleanedData = data.map((obj) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...rest } = obj as any;
      return rest;
    });

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
    options?: {
      skipChangeDetection?: boolean;
      services?: number[];
      isDeleted?: boolean;
    },
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

    if (options && !options.skipChangeDetection) {
      const previousSectionData = this.hashData(
        latestFormToModTemplateVersion.toObject().sections,
      );

      const newSectionData = this.hashData(dto.sections as Section[]);

      if (previousSectionData === newSectionData) {
        throw new BadRequestException('no changes detected');
      }
    }

    const versionNumber = latestFormToModTemplateVersion.versionNumber + 1;

    let newTemplateDocBody: Partial<FormTemplateDocument> = {
      parentFormTemplateId: latestFormToModTemplateVersion.id,
      versionNumber,
      title: latestFormToModTemplateVersion.title,
      sections: dto.sections as Section[],
      artistId,
      type: latestFormToModTemplateVersion.type,
      services: options?.services ?? latestFormToModTemplateVersion.services,
      tags: latestFormToModTemplateVersion.tags,
      usesServicesArrayVersioning:
        latestFormToModTemplateVersion.usesServicesArrayVersioning,
    };

    if (options && options.isDeleted) {
      newTemplateDocBody.isDeleted = true;
      newTemplateDocBody.deletedAt = new Date();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id: _, ...latestTemplateWithoutId } =
      latestFormToModTemplateVersion.toObject();

    let newTemplateId: string;
    let newRootFormTemplateId: string;

    if (
      latestFormToModTemplateVersion.artistId &&
      artistId !== latestFormToModTemplateVersion.artistId
    ) {
      throw new ForbiddenException(
        `You are not allowed to modify this form. You can only modify forms you created or forms from the base template`,
      );
    }

    if (latestFormToModTemplateVersion.versionNumber === 0) {
      // this is a root template form
      newTemplateId = `${latestFormToModTemplateVersion.id}-${artistId}-${versionNumber}`;
      newRootFormTemplateId = latestFormToModTemplateVersion.id;
    } else {
      newTemplateId = `${latestFormToModTemplateVersion.rootFormTemplateId}-${artistId}-${versionNumber}`;
      newRootFormTemplateId = latestFormToModTemplateVersion.rootFormTemplateId;
    }

    newTemplateDocBody = {
      ...latestTemplateWithoutId,
      ...newTemplateDocBody,
      id: newTemplateId,
      rootFormTemplateId: newRootFormTemplateId,
    };

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
    });

    if (!formTemplate) {
      throw new NotFoundException(
        `formTemplate with id ${formTemplateId} not found`,
      );
    }

    if (formTemplate.artistId && artistId !== formTemplate.artistId) {
      throw new ForbiddenException(`You are not allowed to modify this form`);
    }

    const servicesSet = new Set(services);
    const formServices = Array.from(servicesSet);

    if (formTemplate.versionNumber > 0) {
      // removing duplicates from services array

      formTemplate.services = formServices;

      await formTemplate.save();

      return formTemplate;
    } else {
      // creating a new form template with the updated services
      const newFormTemplate = await this.createNewFormFromExistingTemplate(
        artistId,
        formTemplateId,
        { sections: formTemplate.toObject().sections, formTemplateId },
        { skipChangeDetection: true, services: formServices },
      );

      return newFormTemplate;
    }
  }

  async updateCertainFormTemplateSections(
    formTemplateId: string,
    artistId: string,
    dto: UpdateCertainSectionsDto,
  ) {
    /*
     * Updates certain section details and creates a new version
     */

    const formTemplate = await this.formTemplateModel.findOne({
      id: formTemplateId,
    });

    if (!formTemplate) {
      throw new NotFoundException(
        `formTemplate with id ${formTemplateId} not found`,
      );
    }

    if (formTemplate.artistId && artistId !== formTemplate.artistId) {
      throw new ForbiddenException(`You are not allowed to modify this form. `);
    }

    // transform dto.sections into an object with sectionId as key
    const sectionsToChangeMap = dto.sections.reduce(
      (acc: { [key: string]: any }, section) => {
        const sectionData: UpdateCertainSectionsDto['sections'][0]['data'] = [];
        if (section.id) {
          for (const data of section.data) {
            if (!data.skip) {
              sectionData.push(data);
            }
          }
          section.data = sectionData;
          acc[section.id] = section;
        }
        return acc;
      },
      {},
    );

    const sectionsToAdd = dto.sections.filter(
      (section) => !section.id,
    ) as Section[];

    const sectionsForNewFormTemplate: Section[] = [];

    // update sections in formTemplate.sections
    for (const i in formTemplate.sections) {
      const sectionId = formTemplate.sections[i].id;

      if (sectionId in sectionsToChangeMap) {
        if (sectionsToChangeMap[sectionId].skip === true) {
          // skip = true means the section should not be added to the new form template
          continue;
        }
        formTemplate.sections[i] = sectionsToChangeMap[sectionId];
        sectionsForNewFormTemplate.push(formTemplate.sections[i]);
      } else {
        sectionsForNewFormTemplate.push(formTemplate.toObject().sections[i]);
      }
    }

    // add new sections to the end of the array
    for (const section of sectionsToAdd) {
      sectionsForNewFormTemplate.push({ id: randomUUID(), ...section });
    }

    const newFormTemplate = await this.createNewFormFromExistingTemplate(
      artistId,
      formTemplateId,
      { sections: sectionsForNewFormTemplate, formTemplateId },
    );

    return newFormTemplate;
  }

  async deleteFormTemplate(formTemplateId: string, artistId: string) {
    const formTemplate = await this.formTemplateModel.findOne({
      id: formTemplateId,
    });

    if (!formTemplate) {
      throw new NotFoundException(
        `formTemplate with id ${formTemplateId} not found`,
      );
    }

    if (formTemplate.artistId && artistId !== formTemplate.artistId) {
      throw new ForbiddenException(`You are not allowed to delete this form. `);
    }

    if (formTemplate.versionNumber > 0) {
      formTemplate.isDeleted = true;
      formTemplate.deletedAt = new Date();
      await formTemplate.save();
    } else {
      // creating a new form template with the updated services
      await this.createNewFormFromExistingTemplate(
        artistId,
        formTemplateId,
        { sections: formTemplate.toObject().sections, formTemplateId },
        { skipChangeDetection: true, isDeleted: true },
      );
    }

    return { message: 'Form template deleted successfully' };
  }
}
