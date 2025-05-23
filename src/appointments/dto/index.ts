import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class BookAnApppointmentAsCustomerDto {
  @IsNotEmpty()
  @Type(() => Date) // Ensures the value is transformed into a Date object
  @IsDate()
  appointmentDate: Date;

  @IsString()
  @IsNotEmpty()
  artistId: string;

  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  services: number[];
}
export class BookAnApppointmentAsArtistDto {
  @IsNotEmpty()
  @Type(() => Date) // Ensures the value is transformed into a Date object
  @IsDate()
  appointmentDate: Date;

  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  services: number[];
}

export class PaginationParamsDto {
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

export class EditAppointmentDto {
  @IsNotEmpty()
  @Type(() => Date) // Ensures the value is transformed into a Date object
  @IsDate()
  appointmentDate: Date;

  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  services: number[];
}

export class SignAppointmentDto {
  @IsString()
  @IsUrl()
  @IsNotEmpty()
  signatureUrl: string;
}
