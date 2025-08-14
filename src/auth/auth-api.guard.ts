import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class AuthApiGuard implements CanActivate {
  constructor(private configService: AppConfigService) {}
  async canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();
    const token = request.headers['auth-key'];

    const key = this.configService.get('AUTH_API_KEY');
    if (!token || token !== key) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
