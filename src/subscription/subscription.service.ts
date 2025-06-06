import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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
import { UtilsService } from 'src/utils/utils.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { RevenueCatSubcriptionEvent } from './subscription.event';

@Injectable()
export class SubscriptionService {
  private REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';
  private REVENUECAT_API_KEY: string;

  constructor(
    @InjectModel('users') private userModel: Model<UserDocument>,
    private configService: AppConfigService,
    private utilsService: UtilsService,
    private eventEmitter: EventEmitter2,
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
      {
        appStorePurchaseActive: isActive,
        subscriptionLastVerifiedDate: new Date(),
      },
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
    this.eventEmitter.emit(
      'revenuecat.subscription.webhook',
      new RevenueCatSubcriptionEvent({ webhookPayload: payload }),
    );

    return { message: 'success' };
  }

  async refreshSubscriptionStatus(userId: string) {
    await this.updateSubscriptionStatus(userId);
  }

  private async firstTimeSubscriberEmail(email: string, businessName: string) {
    const subject =
      'Thank You for Subscribing – Your PMU Forms Access Is Live!';

    const message = `
      <p>Hi  <strong>${businessName}</strong>,</p>
      <p>Welcome to PMU Forms – we’re so glad you’re here! Your beauty business just got a whole lot easier.💜</p>

      <p> Here’s your quick-start checklist to get you all set up! </p>
      <ul>
        <li>Update your business name: This shows up on all your forms. Go to <strong>Settings → Change Business Name</strong></li>
        <li>✅ Select the services you offer: This organizes your ready-to-use forms to match your offerings.</li>
        <li>📖 <a href="https://pmuforms.crunch.help/en/pmuforms-functionality/managing-your-services"> Watch the quick tutorial </a> </li>
        <li>✍️ Update your signature on file: Your signature will be automatically added to future client forms. <strong>Go to Settings → Update Signature</strong></li>
        <li>🔗 Visit and share your personalized form link: Add this link to your website, booking page, or social media so clients can complete forms ahead of time. We’ll notify you whenever a form is submitted — no need to check manually.</li>
        <li>🛠️ Customize your forms: You can remove any questions or entire forms that don’t apply to your services.</li>
        <li>🧹 <a href="https://pmuforms.crunch.help/en/pmuforms-functionality/how-do-i-delete-a-question-from-pmu-forms"> How to delete a question </a></li>
        <li>✏️  <a href="https://pmuforms.crunch.help/en/pmuforms-functionality/editing-forms"> How to edit a form </a></li>
      </ul>

      <p> Feel free to reply to this email or contact us anytime for questions at 512-521-1052.</p>
      <p>Regards,<br/>PMU Forms Team.</p>
    `;

    await this.utilsService.sendEmail({
      to: email,
      subject,
      message,
    });
  }

  @OnEvent('revenuecat.subscription.webhook', { async: true })
  async handleRevCatSubscription(eventPayload: RevenueCatSubcriptionEvent) {
    const {
      payload: { webhookPayload },
    } = eventPayload;

    const { app_user_id: userId, app_id } = webhookPayload.event;

    if (app_id !== this.configService.get('REVENUECAT_APP_ID')) {
      return { message: 'done' };
    }

    await this.updateSubscriptionStatus(userId);

    if (webhookPayload.event.type === 'INITIAL_PURCHASE') {
      const user = await this.userModel.findOne({ userId });
      await this.firstTimeSubscriberEmail(user.email, user.businessName);
      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }
    }
  }
}
