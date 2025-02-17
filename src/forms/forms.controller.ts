import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { FormsService } from './forms.service';
import { GetUser, Roles } from 'src/auth/decorator';
import { UserRole } from 'src/enums';
import { UserDocument } from 'src/database/schema';
import { NewFormVersionDto } from './dto';
import { UpdateServicesDto } from 'src/services/dto';

@Controller('api/forms')
export class FormsController {
  constructor(private formsService: FormsService) {}

  @Get('/root-templates')
  async getRootTemplates() {
    const forms = await this.formsService.getRootFormTemplates();

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

  @Delete('/:templateId/section/:sectionNumber')
  async deleteSectionFromFormTemplate(
    @GetUser() artist: UserDocument,
    @Param('templateId') templateId: string,
    @Param('sectionNumber', ParseIntPipe) sectionNumber: number,
  ) {
    const form = await this.formsService.deleteSectionFromFormTemplate(
      templateId,
      artist.userId,
      sectionNumber,
    );

    return { form };
  }
}
