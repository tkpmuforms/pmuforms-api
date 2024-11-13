import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SignUpDto, SignInDto } from './dto';
import { AuthService, IUser } from './auth.service';
import { AuthGuard } from './auth.guard';
import { GetUser } from './decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/sign-up')
  async signUp(@Body() signUpDto: SignUpDto) {
    const newUser = await this.authService.signUp(signUpDto);
    return newUser;
  }

  @HttpCode(HttpStatus.OK)
  @Post('/sign-in')
  async signIn(@Body() signInDto: SignInDto) {
    const newUser = await this.authService.signIn(signInDto);
    return newUser;
  }

  @UseGuards(AuthGuard)
  @Get('/me')
  async getMe(@GetUser() user: IUser) {
    return { user };
  }
}
