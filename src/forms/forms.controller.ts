import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { FormsService } from './forms.service';
import { GetUser, Roles } from 'src/auth/decorator';
import { UserRole } from 'src/enums';
import { UserDocument } from 'src/database/schema';
import { NewFormVersionDto, UpdateCertainSectionsDto } from './dto';
import { UpdateServicesDto } from 'src/services/dto';

@Controller('api/forms')
export class FormsController {
  constructor(private formsService: FormsService) {}

  @Get('/root-templates')
  async getRootTemplates() {
    const forms = await this.formsService.getRootFormTemplates();

    return { forms };
  }

  @Roles(UserRole.ARTIST)
  @Get('/my-forms')
  async getArtistFormTemplate(@GetUser() artist: UserDocument) {
    const forms = await this.formsService.getArtistFormTemplates(artist);

    return { forms };
  }

  @Get('/appointment/:appointmentId')
  async getFormsForAnAppointment(
    @Param('appointmentId') appointmentId: string,
  ) {
    const { forms, metadata } =
      await this.formsService.getFormTemplatesForAppointment(appointmentId);

    return { metadata, forms };
  }

  @Roles(UserRole.ARTIST)
  @Post('/new-version')
  async createNewFormVersion(
    @GetUser() artist: UserDocument,
    @Body() dto: NewFormVersionDto,
  ) {
    const form = await this.formsService.createNewFormFromExistingTemplate(
      artist.userId,
      dto.formTemplateId,
      dto,
    );
    return form;
  }

  @Get('/:templateId')
  async getFormTemplateById(@Param('templateId') templateId: string) {
    const form = await this.formsService.getFormTemplateById(templateId);

    return { form };
  }

  @Put('/:templateId/update-services')
  async updateServicesForFormTemplate(
    @GetUser() artist: UserDocument,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateServicesDto,
  ) {
    const form = await this.formsService.updateServicesForFormTemplate(
      templateId,
      artist.userId,
      dto.services,
    );

    return { form };
  }

  @Patch('/:templateId/update-sections')
  async updateCertainFormTemplateSections(
    @GetUser() artist: UserDocument,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateCertainSectionsDto,
  ) {
    const form = await this.formsService.updateCertainFormTemplateSections(
      templateId,
      artist.userId,
      dto,
    );

    return { form };
  }

  @Delete('/:templateId/delete')
  async deleteFormTemplate(
    @GetUser() artist: UserDocument,
    @Param('templateId') templateId: string,
  ) {
    const form = await this.formsService.deleteFormTemplate(
      templateId,
      artist.userId,
    );

    return { form };
  }
}
