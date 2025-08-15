import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  CreateCustomerDto,
  CreateArtistDto,
  SwitchCustomerAuthContextDto,
  ChangePasswordDto,
} from './dto';
import { AuthService } from './auth.service';
import { GetUser, Public, Roles } from './decorator';
import { CustomerDocument, UserDocument } from 'src/database/schema';
import { UserRole } from 'src/enums';
import { AuthApiGuard } from './auth-api.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('/me')
  async getMe(@GetUser() user: UserDocument | CustomerDocument) {
    return { user };
  }

  @Public()
  @UseGuards(AuthApiGuard)
  @Post('/customer/create')
  async createCustomer(@Body() customerDto: CreateCustomerDto) {
    const customer = await this.authService.createCustomer(
      customerDto.accessToken,
      customerDto.artistId,
    );
    return customer;
  }

  @Public()
  @UseGuards(AuthApiGuard)
  @Post('/artist/create')
  async createUser(@Body() userDto: CreateArtistDto) {
    const user = await this.authService.createUser(userDto.accessToken);
    return user;
  }

  @Public()
  @UseGuards(AuthApiGuard)
  @Get('/send-email-verification/:uid')
  async sendEmailVerification(@Param('uid') uid: string) {
    const user = await this.authService.sendEmailVerification(uid);
    return user;
  }

  @Roles(UserRole.CUSTOMER)
  @Post('/customer/switch-context')
  async switchCustomerAuthContext(
    @GetUser() customer: CustomerDocument,
    @Body() dto: SwitchCustomerAuthContextDto,
  ) {
    return await this.authService.switchCustomerAuthContext(
      customer.id,
      dto.artistId,
    );
  }

  @Roles(UserRole.ARTIST)
  @Post('/artist/change-password')
  async changePassword(
    @GetUser() user: UserDocument,
    @Body() dto: ChangePasswordDto,
  ) {
    return await this.authService.changePassword(user.id, dto);
  }
}
