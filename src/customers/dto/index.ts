import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsDate,
  IsEmail,
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

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string;
}

export class EditCustomerNoteDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string;
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

  @IsOptional()
  @IsString()
  name: string | undefined;
}

export class UpdatePersonalDetailsDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @Type(() => Date) // Ensures the value is transformed into a Date object
  @IsDate()
  dob: Date;

  @IsNotEmpty()
  @IsString()
  homeAddress: string;

  @IsNotEmpty()
  @IsString()
  primaryPhone: string;

  @IsOptional()
  @IsString()
  referralSource: string;

  @IsOptional()
  @IsString()
  emergencyContactName: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone: string;

  @IsOptional()
  @IsString()
  avatarUrl: string;
}

export class CreateCustomerDto {
  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string | undefined;

  @IsString()
  @IsNotEmpty()
  name: string;
}
