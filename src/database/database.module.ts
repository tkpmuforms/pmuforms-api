// src/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './schema/user.schema';
import { ConfigService } from 'src/config/config.service';
import { ConfigModule } from 'src/config/config.module';

@Global()
@Module({
  imports: [
    ConfigModule, // Ensure ConfigModule is imported to access ConfigService
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
