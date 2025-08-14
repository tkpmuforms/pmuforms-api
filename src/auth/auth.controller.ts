import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  CreateCustomerDto,
  CreateArtistDto,
  SwitchCustomerAuthContextDto,
} from './dto';
import { AuthService } from './auth.service';
import { GetUser, Public, Roles } from './decorator';
import { CustomerDocument, UserDocument } from 'src/database/schema';
import { UserRole } from 'src/enums';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('/me')
  async getMe(@GetUser() user: UserDocument | CustomerDocument) {
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

  @Roles(UserRole.CUSTOMER)
  @Post('customer/switch-context')
  async switchCustomerAuthContext(
    @GetUser() customer: CustomerDocument,
    @Body() dto: SwitchCustomerAuthContextDto,
  ) {
    return await this.authService.switchCustomerAuthContext(
      customer.id,
      dto.artistId,
    );
  }
}
