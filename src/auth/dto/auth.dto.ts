import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsOptional()
  artistId: string;
}

export class CreateArtistDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}

export class SwitchCustomerAuthContextDto {
  @IsString()
  @IsNotEmpty()
  artistId: string;
}
