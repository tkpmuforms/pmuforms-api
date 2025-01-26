import { Body, Controller, Post, Param, Get } from '@nestjs/common';
import { FilledFormsService } from './filled-forms.service';
import { SubmitFormDto } from './dto';
import { GetCurrentUserRole, GetUser, Roles } from 'src/auth/decorator';
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

  @Roles(UserRole.ARTIST, UserRole.CUSTOMER)
  @Get('/appointment/:appointmentId')
  async getFilledFomsForAppointment(
    @GetUser() user: CustomerDocument | UserDocument,
    @GetCurrentUserRole() userRole: UserRole,
    @Param('appointmentId') appointmentId: string,
  ) {
    // userId- pk in artist collection
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const userId: string = UserRole.ARTIST === userRole ? user.userId : user.id;
    const { metadata, filledForms } =
      await this.filledFormsService.getFilledFormsForAppointment(
        userId,
        appointmentId,
      );

    return { metadata, filledForms };
  }

  @Roles(UserRole.ARTIST, UserRole.CUSTOMER)
  @Get('/appointment/:appointmentId/form/:formTemplateId')
  async getFilledFomForAppointmentByFormTemplateId(
    @GetUser() user: CustomerDocument | UserDocument,
    @GetCurrentUserRole() userRole: UserRole,
    @Param('appointmentId') appointmentId: string,
    @Param('formTemplateId') formTemplateId: string,
  ) {
    // userId- pk in artist collection
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const userId: string = UserRole.ARTIST === userRole ? user.userId : user.id;
    const filledForm =
      await this.filledFormsService.getFilledFormForAppointmentByFormTemplateId(
        userId,
        appointmentId,
        formTemplateId,
      );

    return { filledForm };
  }
}
