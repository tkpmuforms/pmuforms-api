import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateCustomerDto, CreateArtistDto } from './dto';
import { AuthService } from './auth.service';
import { GetUser, Public } from './decorator';
import { UserDocument } from 'src/database/schema';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('/me')
  async getMe(@GetUser() user: UserDocument) {
    return { user };
  }

  @Public()
  @Post('/customer/create')
  async createCustomer(@Body() customerDto: CreateCustomerDto) {
    const customer = await this.authService.createCustomer(
      customerDto.accessToken,
      customerDto.artistId,
    );
    return customer;
  }

  @Public()
  @Post('/artist/create')
  async createUser(@Body() userDto: CreateArtistDto) {
    const user = await this.authService.createUser(userDto.accessToken);
    return user;
  }

  @Public()
  @Get('/send-email-verification/:uid')
  async sendEmailVerification(@Param('uid') uid: string) {
    const user = await this.authService.sendEmailVerification(uid);
    return user;
  }
}
