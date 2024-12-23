import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateBusinessNameDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;
}
