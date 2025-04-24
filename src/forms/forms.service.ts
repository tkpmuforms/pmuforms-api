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
import {
  NewFormVersionDto,
  UpdateSectionDataDto,
  UpdateCertainSectionsDto,
  AddSectionDataDto,
} from './dto';
import { paginationMetaGenerator } from 'src/utils';
import { createHash, randomUUID } from 'node:crypto';
import { OnEvent } from '@nestjs/event-emitter';
import { FormTemplateDeletedEvent } from './forms.events';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class FormsService {
  constructor(
    private eventEmitter: EventEmitter2,
    @InjectModel('form-templates')
    private formTemplateModel: Model<FormTemplateDocument>,
    @InjectModel('appointments')
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel('users')
    private artistModel: Model<UserDocument>,
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
    const validForms: FormTemplateDocument[] = [];
    for (const i in forms) {
      const latestFormVersion = await this.getLatestFormTemplateByArtist(
        artist.userId,
        forms[i].id,
      );
      if (latestFormVersion) {
        if (latestFormVersion.isDeleted) {
          continue;
        }
        validForms.push(latestFormVersion);
      } else {
        validForms.push(forms[i]);
      }
    }

    return validForms;
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

    const validForms = [];

    // replace root forms with the most recent version if it exists
    for (const f of forms) {
      const latestFormVersion = await this.getLatestFormTemplateByArtist(
        appointment.artistId,
        f.id,
      );

      if (latestFormVersion) {
        if (
          latestFormVersion.isDeleted ||
          latestFormVersion.services.length === 0
        ) {
          continue;
        }
        validForms.push(latestFormVersion);
      } else {
        validForms.push(f);
      }
    }

    const metadata = paginationMetaGenerator(forms.length, 1, forms.length);

    return { metadata, forms: validForms };
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
    dto: NewFormVersionDto,
    options?: {
      skipChangeDetection?: boolean;
      services?: number[];
      isDeleted?: boolean;
    },
  ) {
    const formToMod = await this.formTemplateModel.findOne({
      id: dto.formTemplateId,
    });

    if (!formToMod || formToMod.isDeleted) {
      throw new NotFoundException(
        `form template with id ${dto.formTemplateId} not found`,
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

    if (!formTemplate || formTemplate.isDeleted) {
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

    if (!formTemplate || formTemplate.isDeleted) {
      throw new NotFoundException(
        `formTemplate with id ${formTemplateId} not found`,
      );
    }

    if (formTemplate.artistId && artistId !== formTemplate.artistId) {
      throw new ForbiddenException(`You are not allowed to modify this form. `);
    }

    // transform dto.sections into an object with sectionId as key
    const sectionsToAdd: UpdateCertainSectionsDto['sections'] = [];

    const sectionsToChangeMap = dto.sections.reduce(
      (
        acc: { [key: string]: UpdateCertainSectionsDto['sections'][0] },
        section,
      ) => {
        const sectionData: UpdateCertainSectionsDto['sections'][0]['data'] = [];
        if (section.id) {
          for (const data of section.data) {
            if (!data.skip) {
              sectionData.push(data);
            }
          }
          section.data = sectionData;
          acc[section.id] = section;
        } else {
          sectionsToAdd.push(section);
        }
        return acc;
      },
      {},
    );

    const sectionsForNewFormTemplate: UpdateCertainSectionsDto['sections'] = [];

    // update sections in formTemplate.sections
    for (const i in formTemplate.sections) {
      const sectionId = formTemplate.sections[i].id;

      if (sectionId in sectionsToChangeMap) {
        if (sectionsToChangeMap[sectionId].skip === true) {
          // skip = true means the section should not be added to the new form template
          continue;
        }
        formTemplate.sections[i] = {
          ...sectionsToChangeMap[sectionId],
          id: sectionId,
        };
        sectionsForNewFormTemplate.push(formTemplate.sections[i]);
      } else {
        sectionsForNewFormTemplate.push(formTemplate.toObject().sections[i]);
      }
    }

    // add new sections to the end of the array
    for (const section of sectionsToAdd) {
      const sectionData: UpdateCertainSectionsDto['sections'][0]['data'] = [];
      for (const data of section.data) {
        if (!data.skip) {
          sectionData.push(data);
        }
      }
      section.data = sectionData;
      sectionsForNewFormTemplate.push({ id: randomUUID(), ...section });
    }

    const newFormTemplate = await this.createNewFormFromExistingTemplate(
      artistId,
      { sections: sectionsForNewFormTemplate, formTemplateId },
    );

    return newFormTemplate;
  }

  async deleteFormTemplate(formTemplateId: string, artistId: string) {
    const formTemplate = await this.formTemplateModel.findOne({
      id: formTemplateId,
    });

    if (!formTemplate || formTemplate.isDeleted) {
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
        { sections: formTemplate.toObject().sections, formTemplateId },
        { skipChangeDetection: true, isDeleted: true },
      );
    }

    this.eventEmitter.emit(
      'form-template.deleted',
      new FormTemplateDeletedEvent({ artistId }),
    );

    return { message: 'Form template deleted successfully' };
  }

  async updateDataInASection(
    artistId: string,
    formTemplateId: string,
    sectionId: string,
    dataId: string,
    dto: UpdateSectionDataDto,
  ) {
    const formTemplate = await this.formTemplateModel.findOne({
      id: formTemplateId,
    });

    if (!formTemplate || formTemplate.isDeleted) {
      throw new NotFoundException(
        `formTemplate with id ${formTemplateId} not found`,
      );
    }

    if (formTemplate.artistId && artistId !== formTemplate.artistId) {
      throw new ForbiddenException(`You are not allowed to modify this form. `);
    }

    const sectionIndex = formTemplate.sections.findIndex(
      (section) => section.id === sectionId,
    );

    if (sectionIndex === -1) {
      throw new NotFoundException(
        `section with id ${sectionId} not found in formTemplate with id ${formTemplateId}`,
      );
    }

    const dataIndex = formTemplate.sections[sectionIndex].data.findIndex(
      (data) => data.id === dataId,
    );

    if (dataIndex === -1) {
      throw new NotFoundException(
        `data with id ${dataId} not found in section with id ${sectionId} in formTemplate with id ${formTemplateId}`,
      );
    }

    formTemplate.sections[sectionIndex].data[dataIndex] = {
      id: dataId,
      ...dto,
    };

    const newFormTemplate = await this.createNewFormFromExistingTemplate(
      artistId,
      { sections: formTemplate.toObject().sections, formTemplateId },
    );

    return newFormTemplate;
  }

  async addNewDataInASection(
    artistId: string,
    formTemplateId: string,
    sectionId: string,
    dto: AddSectionDataDto,
  ) {
    const formTemplate = await this.formTemplateModel.findOne({
      id: formTemplateId,
    });

    if (!formTemplate || formTemplate.isDeleted) {
      throw new NotFoundException(
        `formTemplate with id ${formTemplateId} not found`,
      );
    }

    if (formTemplate.artistId && artistId !== formTemplate.artistId) {
      throw new ForbiddenException(`You are not allowed to modify this form. `);
    }

    const sectionIndex = formTemplate.sections.findIndex(
      (section) => section.id === sectionId,
    );

    if (sectionIndex === -1) {
      throw new NotFoundException(
        `section with id ${sectionId} not found in formTemplate with id ${formTemplateId}`,
      );
    }

    formTemplate.sections[sectionIndex].data.push({ ...dto, id: randomUUID() });

    const newFormTemplate = await this.createNewFormFromExistingTemplate(
      artistId,
      { sections: formTemplate.toObject().sections, formTemplateId },
    );

    return newFormTemplate;
  }

  async deleteSection(
    artistId: string,
    formTemplateId: string,
    sectionId: string,
  ) {
    const formTemplate = await this.formTemplateModel.findOne({
      id: formTemplateId,
    });

    if (!formTemplate || formTemplate.isDeleted) {
      throw new NotFoundException(
        `formTemplate with id ${formTemplateId} not found`,
      );
    }

    if (formTemplate.artistId && artistId !== formTemplate.artistId) {
      throw new ForbiddenException(`You are not allowed to modify this form. `);
    }

    const sectionIndex = formTemplate.sections.findIndex(
      (section) => section.id === sectionId,
    );

    if (sectionIndex === -1) {
      throw new NotFoundException(
        `section with id ${sectionId} not found in formTemplate with id ${formTemplateId}`,
      );
    }

    formTemplate.sections.splice(sectionIndex, 1);

    const newFormTemplate = await this.createNewFormFromExistingTemplate(
      artistId,
      { sections: formTemplate.toObject().sections, formTemplateId },
    );

    return newFormTemplate;
  }

  async deleteDataInASection(
    artistId: string,
    formTemplateId: string,
    sectionId: string,
    dataId: string,
  ) {
    const formTemplate = await this.formTemplateModel.findOne({
      id: formTemplateId,
    });

    if (!formTemplate || formTemplate.isDeleted) {
      throw new NotFoundException(
        `formTemplate with id ${formTemplateId} not found`,
      );
    }

    if (formTemplate.artistId && artistId !== formTemplate.artistId) {
      throw new ForbiddenException(`You are not allowed to modify this form. `);
    }

    const sectionIndex = formTemplate.sections.findIndex(
      (section) => section.id === sectionId,
    );

    if (sectionIndex === -1) {
      throw new NotFoundException(
        `section with id ${sectionId} not found in formTemplate with id ${formTemplateId}`,
      );
    }

    const dataIndex = formTemplate.sections[sectionIndex].data.findIndex(
      (data) => data.id === dataId,
    );

    if (dataIndex === -1) {
      throw new NotFoundException(
        `data with id ${dataId} not found in section with id ${sectionId} in formTemplate with id ${formTemplateId}`,
      );
    }

    formTemplate.sections[sectionIndex].data.splice(dataIndex, 1);

    const newFormTemplate = await this.createNewFormFromExistingTemplate(
      artistId,
      { sections: formTemplate.toObject().sections, formTemplateId },
    );

    return newFormTemplate;
  }

  @OnEvent('form-template.deleted', { async: true })
  async handleFilledFormSubmittedEvent(event: FormTemplateDeletedEvent) {
    /* checks if there are services the artists offers with no valid forms and removes it from the artist's services */
    try {
      const { artistId } = event.payload;

      const artist = await this.artistModel.findOne({ userId: artistId });
      if (!artist) {
        return;
      }

      const servicesToFormCountMap = artist.services.reduce(
        (acc: { [key: string]: number }, service) => {
          acc[service.id.toString()] = 0;
          return acc;
        },
        {},
      );

      const artistsFormTemplates = await this.getArtistFormTemplates(artist);

      for (const formTemplate of artistsFormTemplates) {
        for (const serviceId of formTemplate.services) {
          if (serviceId.toString() in servicesToFormCountMap) {
            servicesToFormCountMap[serviceId.toString()] += 1;
          }
        }
      }

      /* No valid form exists for these services */
      const servicesToRemove = Object.keys(servicesToFormCountMap).filter(
        (serviceId) => servicesToFormCountMap[serviceId] === 0,
      );

      if (servicesToRemove.length > 0) {
        const newArtistsServices = artist.services.filter(
          (service) => !servicesToRemove.includes(service.id.toString()),
        );
        artist.services = newArtistsServices;
        await artist.save();
      }
    } catch {
      console.log('error in form-template.deleted event', {
        payload: event.payload,
      });
    }
  }
}
