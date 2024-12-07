import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { AppConfigService } from 'src/config/config.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument, CustomerDocument } from 'src/database/schema';
import { UserRole } from 'src/enums';
import { IS_PUBLIC_KEY } from './decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectModel('users') private userModel: Model<UserDocument>,
    @InjectModel('customers') private customerModel: Model<CustomerDocument>,
    private configService: AppConfigService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('no token');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Get the user from the database
      let user: any;

      if (payload.role === UserRole.ARTIST) {
        user = await this.userModel.findOne({ userId: payload.sub });
      }
      if (payload.role === UserRole.CUSTOMER) {
        user = await this.customerModel.findOne({ id: payload.sub });
      }
      if (!user) {
        throw new UnauthorizedException();
      }
      request['user'] = user;
      request['userRole'] = payload.role;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
