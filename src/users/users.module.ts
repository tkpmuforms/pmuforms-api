import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UrlService } from 'src/url/url.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UrlService, FirebaseService],
})
export class UsersModule {}
