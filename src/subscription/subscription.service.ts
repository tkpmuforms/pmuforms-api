import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from 'src/database/schema';
import {
  RevCatWebhookPayload,
  GetSubscriberResponse,
} from './subscription.types';
import axios from 'axios';
import { AppConfigService } from 'src/config/config.service';
import { DateTime } from 'luxon';

@Injectable()
export class SubscriptionService {
  private REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';
  private REVENUECAT_API_KEY: string;

  constructor(
    @InjectModel('users') private userModel: Model<UserDocument>,
    private configService: AppConfigService,
  ) {
    this.REVENUECAT_API_KEY = this.configService.get('REVENUECAT_API_KEY');
  }

  private revenueCatAxiosInstance() {
    return axios.create({
      baseURL: this.REVENUECAT_API_URL,
      headers: {
        Authorization: `Bearer ${this.REVENUECAT_API_KEY}`,
      },
    });
  }

  private async updateSubscriptionStatus(userId: string) {
    const { subscriber } = await this.getUserSubcriptionInfo(userId);
    let isActive = false;

    const sandboxAllowed = this.configService.get('NODE_ENV') !== 'production';

    if (subscriber.entitlements?.pro) {
      const subscription = subscriber.entitlements.pro.product_identifier;
      const isSandbox = subscriber.subscriptions[subscription]?.is_sandbox;

      if (isSandbox && !sandboxAllowed) {
        isActive = false;
      } else {
        isActive ||=
          DateTime.fromISO(subscriber.entitlements.pro.expires_date) >
          DateTime.now();
      }
    }

    await this.userModel.updateOne(
      { userId },
      { appStorePurchaseActive: isActive },
    );
  }

  private async getUserSubcriptionInfo(userId: string) {
    try {
      const axios = this.revenueCatAxiosInstance();
      const res = await axios.get<GetSubscriberResponse>(
        `/subscribers/${userId}`,
      );
      return res.data;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unable to get subscription');
    }
  }

  async handleRevenueCatSubscription(payload: RevCatWebhookPayload) {
    const { app_user_id: userId, app_id } = payload.event;

    if (app_id !== this.configService.get('REVENUECAT_APP_ID')) {
      return { message: 'done' };
    }

    await this.updateSubscriptionStatus(userId);

    return { message: 'success' };
  }

  async refreshSubscriptionStatus(userId: string) {
    await this.updateSubscriptionStatus(userId);
  }
}
