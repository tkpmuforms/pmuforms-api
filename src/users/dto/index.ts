import { IsNotEmpty, IsString } from 'class-validator';

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
