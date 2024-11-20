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

// export class SignUpDto {
//   @IsEmail()
//   @IsNotEmpty()
//   email: string;

//   @IsString()
//   @IsNotEmpty()
//   password: string;

//   @IsString()
//   @IsNotEmpty()
//   @MaxLength(30)
//   firstName: string;
// }

// export class SignInDto {
//   @IsEmail()
//   @IsNotEmpty()
//   email: string;

//   @IsString()
//   @IsNotEmpty()
//   password: string;
// }
