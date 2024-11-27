// src/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSchema, RelationshipSchema, UserSchema } from './schema';
import { AppConfigService } from 'src/config/config.service';
import { AppConfigModule } from 'src/config/config.module';

@Global()
@Module({
  imports: [
    AppConfigModule, // Ensure ConfigModule is imported to access ConfigService
    MongooseModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: async (configService: AppConfigService) => ({
        uri: configService.get('MONGO_URI'),
      }),
      inject: [AppConfigService],
    }),
    MongooseModule.forFeature([
      { name: 'users', schema: UserSchema },
      { name: 'customers', schema: CustomerSchema },
      { name: 'relationships', schema: RelationshipSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
