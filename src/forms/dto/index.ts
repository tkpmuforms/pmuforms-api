import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsInt,
} from 'class-validator';

export class NewFormVersionDto {
  @IsString()
  @IsNotEmpty()
  formTemplateId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections: SectionDto[];
}

export class UpdateFormServicesDTO {
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  services: number[];
}

class SectionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDataDto)
  data: SectionDataDto[];

  @IsNotEmpty()
  @IsString()
  title: string;
}

class SectionDataDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  line: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}
