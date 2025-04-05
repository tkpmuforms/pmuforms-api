import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';

export * from './update-certain-sections.dto';

export class UpdateCertainSectionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections: SectionDto[];
}

class SectionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDataDto)
  data: SectionDataDto[];

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsBoolean()
  isClientInformation?: boolean;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsBoolean()
  skip?: boolean;
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
