import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class AddSectionDataDto {
  @IsNotEmpty()
  @IsString()
  line: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}
