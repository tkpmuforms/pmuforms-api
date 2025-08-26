import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  Min,
  IsPhoneNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBusinessNameDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;
}

export class UpdateFcmTokenDto {
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}

export class UpdateSignatureUrlDto {
  @IsString()
  @IsNotEmpty()
  signature_url: string;
}

export class TestPushNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;
}

export class SearchMyArtistsQueryParamsDto {
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
  name?: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;
}
