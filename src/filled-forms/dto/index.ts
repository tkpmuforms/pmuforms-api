import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class SubmitFormDto {
  @IsString()
  @IsNotEmpty()
  appointmentId: string;

  @IsString()
  @IsNotEmpty()
  formTemplateId: string;

  @IsObject()
  data: { [key: string]: any };
}
