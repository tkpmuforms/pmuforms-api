import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateSectionDataDto {
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

  @IsOptional()
  @IsBoolean()
  skip?: boolean;
}
