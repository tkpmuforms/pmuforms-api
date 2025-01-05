import { Body, Controller, Post, Param, Get } from '@nestjs/common';
import { FilledFormsService } from './filled-forms.service';
import { SubmitFormDto } from './dto';
import { GetUser, Roles } from 'src/auth/decorator';
import { UserRole } from 'src/enums';
import { CustomerDocument, UserDocument } from 'src/database/schema';

@Controller('api/filled-forms')
export class FilledFormsController {
  constructor(private filledFormsService: FilledFormsService) {}

  @Roles(UserRole.CUSTOMER)
  @Post('/submit')
  async submitForm(
    @GetUser() customer: CustomerDocument,
    @Body() dto: SubmitFormDto,
  ) {
    const filledForm = await this.filledFormsService.submitForm(
      dto.appointmentId,
      customer.id,
      dto.formTemplateId,
      dto.data,
    );

    return { filledForm };
  }

  @Roles(UserRole.ARTIST)
  @Get('/appointment/:appointmentId')
  async getFilledFoms(
    @GetUser() artist: UserDocument,
    @Param('appointmentId') appointmentId: string,
  ) {
    const filledForm = await this.filledFormsService.getFilledForms(
      artist.userId,
      appointmentId,
    );

    return { filledForm };
  }
}
