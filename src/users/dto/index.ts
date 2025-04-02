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
