import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  artistId: string;
}
export class CreateArtistDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
