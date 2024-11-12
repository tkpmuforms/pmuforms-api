import { Module, Global } from '@nestjs/common';
import { ConfigModule as DefaultConfigModule } from '@nestjs/config';
import { configSchema } from './config.schema';
import { ConfigService } from './config.service';

@Global()
@Module({
  imports: [
    DefaultConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [() => validateConfig(process.env)],
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}

function validateConfig(config: Record<string, unknown>) {
  const result = configSchema.safeParse(config);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Configuration validation error');
  }
  return result.data;
}
