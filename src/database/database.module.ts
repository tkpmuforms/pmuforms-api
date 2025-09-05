// src/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AppointmentSchema,
  CustomerSchema,
  FilledFormSchema,
  FormTemplateSchema,
  MessageSchema,
  RelationshipSchema,
  ReminderSchema,
  ServiceSchema,
  UrlSchema,
  UserSchema,
} from './schema';
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
      { name: 'services', schema: ServiceSchema },
      { name: 'appointments', schema: AppointmentSchema },
      { name: 'form-templates', schema: FormTemplateSchema },
      { name: 'filled-forms', schema: FilledFormSchema },
      { name: 'urls', schema: UrlSchema },
      { name: 'messages', schema: MessageSchema },
      { name: 'reminders', schema: ReminderSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
