import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/enums';
import { SUBSCRIPTION_KEY } from './decorators';
import { UserDocument } from 'src/database/schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel('users') private userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const subscriptionBlock = this.reflector.getAllAndOverride<boolean>(
      SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!subscriptionBlock) {
      return true;
    }

    // NOTE: values set in src/auth/auth.guard.ts
    const { userRole, user, artistId } = context.switchToHttp().getRequest();
    let isSubscribed = false;
    let artist: UserDocument;

    if (userRole === UserRole.ARTIST) {
      artist = user as UserDocument;
      isSubscribed = this.getSubscriptionStatus(artist);
    } else {
      artist = await this.userModel.findOne({ userId: artistId });
      if (!artist) {
        return false;
      }
      isSubscribed = this.getSubscriptionStatus(artist);
    }

    return isSubscribed;
  }

  getSubscriptionStatus(artist: UserDocument): boolean {
    return artist.appStorePurchaseActive;
  }
}
