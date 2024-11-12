import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SignUpDto, SignInDto } from './dto';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { Request } from 'express';
import { ConfigService } from 'src/config/config.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @Post('/sign-up')
  async signUp(@Body() signUpDto: SignUpDto) {
    const newUser = await this.authService.signUp(signUpDto);
    return newUser;
  }

  @Post('/sign-in')
  async signIn(@Body() signInDto: SignInDto) {
    const newUser = await this.authService.signIn(signInDto);
    return newUser;
  }

  @UseGuards(AuthGuard)
  @Get('/me')
  getMe(@Req() req: Request & { user: any }) {
    return { user: req.user, port: this.configService.get('PORT') };
  }
}
