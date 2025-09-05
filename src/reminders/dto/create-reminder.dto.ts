import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
  Validate,
  IsEnum,
} from 'class-validator';
import { ReminderType } from 'src/enums';
import { IsFutureDateConstraint } from './is-future-date';

export class CreateReminderDto {
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @IsNotEmpty()
  @IsDateString({}, { message: 'sendAt must be a valid ISO 8601 date string' })
  @Validate(IsFutureDateConstraint)
  sendAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must not exceed 500 characters' })
  note?: string;

  @IsEnum(ReminderType)
  @IsNotEmpty()
  type: ReminderType;
}
