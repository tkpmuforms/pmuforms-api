import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
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
    if (!artistId) {
      // situation where the customer is not logged in with any artist
      return true;
    }

    let isSubscribed = false;
    let artist: UserDocument;

    if (userRole === UserRole.CUSTOMER) {
      artist = await this.userModel.findOne({
        $or: [{ userId: artistId }, { businessUri: artistId }],
      });
      if (!artist) {
        throw new ForbiddenException('Invalid artist');
      }
      isSubscribed = this.getSubscriptionStatus(artist);
    } else {
      artist = user as UserDocument;
      isSubscribed = this.getSubscriptionStatus(artist);
    }

    if (!isSubscribed) {
      throw new ForbiddenException(
        `Artist Subscription Inactive. Please Subscribe`,
      );
    }

    return true;
  }

  getSubscriptionStatus(artist: UserDocument): boolean {
    return artist.appStorePurchaseActive;
  }
}
