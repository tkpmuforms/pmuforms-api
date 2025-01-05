import { Controller, Get, Param } from '@nestjs/common';
import { FormsService } from './forms.service';

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
    const forms =
      await this.formsService.getFormTemplatesForAppointment(appointmentId);

    return { forms };
  }
}
