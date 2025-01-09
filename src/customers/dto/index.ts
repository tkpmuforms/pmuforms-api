import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class GetMyCustomersQueryParamsDto {
  @IsOptional()
  @Type(() => Number) // Ensures the value is cast to a number
  @IsInt({ message: 'Page must be an integer.' })
  @Min(1, { message: 'Page must be at least 1.' })
  page?: number;

  @IsOptional()
  @Type(() => Number) // Ensures the value is cast to a number
  @IsInt({ message: 'Limit must be an integer.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  limit?: number;
}

export class CreateCustomerNoteDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string;
}

export class EditCustomerNoteDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string;
}
export class SearchMyCustomersQueryParamsDto {
  @IsOptional()
  @Type(() => Number) // Ensures the value is cast to a number
  @IsInt({ message: 'Page must be an integer.' })
  @Min(1, { message: 'Page must be at least 1.' })
  page?: number;

  @IsOptional()
  @Type(() => Number) // Ensures the value is cast to a number
  @IsInt({ message: 'Limit must be an integer.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  limit?: number;

  @IsNotEmpty()
  @IsString()
  name: string;
}
