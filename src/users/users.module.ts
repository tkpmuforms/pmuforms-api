import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UrlService } from 'src/url/url.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UrlService],
})
export class UsersModule {}
