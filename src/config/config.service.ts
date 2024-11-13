import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import type { AppConfig } from './config.schema';

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService<AppConfig>) {}

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.configService.get<AppConfig[K]>(key);
  }
}
