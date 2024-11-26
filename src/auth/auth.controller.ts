import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CreateCustomerDto, CreateArtistDto } from './dto';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { GetUser } from './decorator';
import { UserDocument } from 'src/database/schema';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard)
  @Get('/me')
  async getMe(@GetUser() user: UserDocument) {
    return { user };
  }

  @Post('/customer/create')
  async createCustomer(@Body() customerDto: CreateCustomerDto) {
    const customer = await this.authService.createCustomer(
      customerDto.accessToken,
      customerDto.artistId,
    );
    return customer;
  }

  @Post('/artist/create')
  async createUser(@Body() userDto: CreateArtistDto) {
    const user = await this.authService.createUser(userDto.accessToken);
    return user;
  }
}
