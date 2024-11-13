import { Module, SetMetadata } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
// import { AuthGuard } from './auth.guard';
// import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    JwtModule.register({
      global: true,
    }),
    // {
    //   provide: APP_GUARD,
    //   useClass: AuthGuard,
    // },
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
