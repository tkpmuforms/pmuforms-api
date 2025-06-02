import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class RevenueCatWebhookGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: AppConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('no token');
    }
    const secret = this.configService.get('REVENUECAT_WEBHOOK_SECRET');
    if (secret !== token) {
      throw new UnauthorizedException('invalid token');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
