import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CreateCustomerDto, CreateArtistDto } from './dto';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { GetUser } from './decorator';
import { UserDocument } from 'src/database/schema';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @Post('/sign-up')
  // async signUp(@Body() signUpDto: SignUpDto) {
  //   const newUser = await this.authService.signUp(signUpDto);
  //   return newUser;
  // }

  // @HttpCode(HttpStatus.OK)
  // @Post('/sign-in')
  // async signIn(@Body() signInDto: SignInDto) {
  //   const newUser = await this.authService.signIn(signInDto);
  //   return newUser;
  // }

  @UseGuards(AuthGuard)
  @Get('/me')
  async getMe(@GetUser() user: UserDocument) {
    return { user };
  }

  @Post('/customer/create')
  async createCustomer(@Body() customerDto: CreateCustomerDto) {
    const customer = await this.authService.createCustomer(
      customerDto.accessToken,
    );
    return customer;
  }

  @Post('/artist/create')
  async createUser(@Body() userDto: CreateArtistDto) {
    const user = await this.authService.createUser(userDto.accessToken);
    return user;
  }
}
