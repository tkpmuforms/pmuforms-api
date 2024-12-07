import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
    }),
  ],
  providers: [AuthService, FirebaseService],
  controllers: [AuthController],
})
export class AuthModule {}
