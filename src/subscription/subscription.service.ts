import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
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
import { StripeService } from 'src/stripe/stripe.service';
import {
  CreateStripeSubscriptionDto,
  AddStripePaymentMethodDto,
  ChangeSubscriptionPlanDto,
  DetachStripePaymentMethodDto,
} from './dto';
import { StripeWebhookService } from './stripe-webhook/stripe-webhook.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';
  private REVENUECAT_API_KEY: string;

  constructor(
    @InjectModel('users') private userModel: Model<UserDocument>,
    private configService: AppConfigService,
    private utilsService: UtilsService,
    private eventEmitter: EventEmitter2,
    private stripeService: StripeService,
    private stripeWebhookService: StripeWebhookService,
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
    } catch (error) {
      this.logger.log(error.message ?? '', { trace: error });
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

  private async firstTimeSubscriberEmail(email: string, businessName?: string) {
    const businessNameToUse =
      !businessName || businessName === 'New Business' ? '' : businessName;
    const subject =
      'Thank You for Subscribing – Your PMU Forms Access Is Live!';

    const message = `
      <p>Hi  <strong>${businessNameToUse}</strong>,</p>
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
      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }
      await this.firstTimeSubscriberEmail(user.email, user.businessName);
    }
  }

  private async getOrCreateStripeCustomerId(userId: string) {
    const artist = await this.userModel
      .findOne({ userId })
      .select('+stripeCustomerId');

    if (!artist) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    if (!artist.stripeCustomerId) {
      const stripeCustomer =
        await this.stripeService.createStripeCustomer(artist);
      artist.stripeCustomerId = stripeCustomer.id;
      await artist.save();
    }

    return artist.stripeCustomerId;
  }

  async addStripePaymentMethod(
    artistId: string,
    { paymentMethodId }: AddStripePaymentMethodDto,
  ) {
    const artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }
    const stripeCustomerId = await this.getOrCreateStripeCustomerId(artistId);

    await this.stripeService.attachPaymentMethodToCustomer(
      paymentMethodId,
      stripeCustomerId,
    );

    // Update customer to set this PM as default
    await this.stripeService.updateDefaultPaymentMethod(
      stripeCustomerId,
      paymentMethodId,
    );

    await this.userModel.findByIdAndUpdate(artist._id, {
      defaultStripePaymentMethod: paymentMethodId,
    });
    return { success: true, message: 'Payment method added successfully' };
  }

  async detachPaymentMethod(
    artistId: string,
    { paymentMethodId }: DetachStripePaymentMethodDto,
  ) {
    return this.stripeService.detachPaymentMethod(paymentMethodId);
  }

  async listStripePaymentMethods(artistId: string) {
    const stripeCustomerId = await this.getOrCreateStripeCustomerId(artistId);

    return this.stripeService.listCustomerPaymentMethods({
      stripeCustomerId,
      type: 'card',
    });
  }

  async listStripeCustomerTransactions(artistId: string) {
    const stripeCustomerId = await this.getOrCreateStripeCustomerId(artistId);

    const invoices = await this.stripeService.listCustomerTransactions(
      { stripeCustomerId },
      { limit: 10 },
    );

    const invoicesResponse = invoices.data.map((inv) => ({
      id: inv.id,
      amount: inv.amount_paid / 100, // convert cents → dollars
      currency: inv.currency,
      status: inv.status, // e.g. paid, open, uncollectible
      created: new Date(inv.created * 1000),
      hosted_invoice_url: inv.hosted_invoice_url,
    }));

    return {
      invoices: invoicesResponse,
      hasMore: invoices.has_more,
      lastInvoiceId: invoices.data.length
        ? invoices.data[invoices.data.length - 1].id
        : null,
    };
  }

  async createStripeSubscription(
    artistId: string,
    dto: CreateStripeSubscriptionDto,
  ) {
    const artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }

    const stripeCustomerId = await this.getOrCreateStripeCustomerId(artistId);

    const { priceId, paymentMethodId } = dto;

    if (paymentMethodId) {
      await this.stripeService.attachPaymentMethodToCustomer(
        paymentMethodId,
        stripeCustomerId,
      );

      // Update customer to set this PM as default
      await this.stripeService.updateDefaultPaymentMethod(
        stripeCustomerId,
        paymentMethodId,
      );
      this.logger.log(
        `Set default payment method for customer ${stripeCustomerId} to ${paymentMethodId}`,
      );
      await this.userModel.findByIdAndUpdate(artist._id, {
        defaultStripePaymentMethod: paymentMethodId,
      });
    }

    const subscriptionResponse =
      await this.stripeService.createStripeSubscription({
        stripeCustomerId,
        defaultPaymentMethod: paymentMethodId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
      });
    return subscriptionResponse;
  }

  async getSubscription(artistId: string) {
    const artist = await this.userModel.findOne({ userId: artistId });
    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }
    if (!artist.stripeSubscriptionId || !artist.stripeCustomerId) {
      throw new BadRequestException(
        `Artist ${artistId} does not have an active subscription, create a subscription.`,
      );
    }
    return await this.stripeService.getSubscription(
      artist.stripeSubscriptionId,
    );
  }

  async changeSubscriptionPlan(
    artistId: string,
    dto: ChangeSubscriptionPlanDto,
  ) {
    const artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }

    if (!artist.stripeCustomerId) {
      throw new BadRequestException(
        `Artist ${artistId} does not have a Stripe customer ID, create a subscription.`,
      );
    }

    if (artist.activeStripePriceId === dto.newPriceId) {
      this.logger.warn(
        `Artist ${artistId} is already subscribed to price ${dto.newPriceId}. No change needed.`,
      );
      // Retrieve and return the current subscription as no change is made
      return this.stripeService.getSubscription(artist.stripeSubscriptionId);
    }

    if (!artist.stripeSubscriptionId) {
      throw new BadRequestException(
        `Artist ${artistId} does not have an active subscription to change, create a subscription.`,
      );
    }

    if (dto.paymentMethodId) {
      await this.stripeService.attachPaymentMethodToCustomer(
        dto.paymentMethodId,
        artist.stripeCustomerId,
      );

      // Update customer to set this PM as default
      await this.stripeService.updateDefaultPaymentMethod(
        artist.stripeCustomerId,
        dto.paymentMethodId,
      );

      await this.userModel.findByIdAndUpdate(artist._id, {
        defaultStripePaymentMethod: dto.paymentMethodId,
      });
    }

    const updatedSubscription = await this.stripeService.updateSubscription({
      subscriptionId: artist.stripeSubscriptionId,
      cancelAtPeriodEnd: false,
      prorationBehavior: 'create_prorations', // handle billing adjustments
      items: [
        {
          price: dto.newPriceId,
        },
      ],
    });

    return updatedSubscription;
  }

  async cancelSubscription(artistId: string) {
    const artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }

    if (!artist.stripeCustomerId) {
      throw new BadRequestException(
        `Artist ${artistId} does not have a Stripe customer ID, create a subscription.`,
      );
    }

    if (!artist.stripeSubscriptionId) {
      throw new BadRequestException(
        `Artist ${artistId} does not have an active subscription to cancel, create a subscription.`,
      );
    }

    const updatedSubscription = await this.stripeService.updateSubscription({
      subscriptionId: artist.stripeSubscriptionId,
      cancelAtPeriodEnd: true,
    });

    return updatedSubscription;
  }

  async handleStripeWebhookEvent(
    signature: string | undefined,
    rawBody: Buffer | undefined,
  ) {
    if (!signature) {
      this.logger.warn('Webhook request missing Stripe signature header.');
      throw new BadRequestException('Missing Stripe signature header.');
    }

    if (!rawBody) {
      this.logger.error(
        'Webhook request missing raw body. Check server configuration.',
      );
      throw new BadRequestException('Missing raw request body.');
    }

    const event = await this.stripeService.constructStripeWebhookEvent(
      signature,
      rawBody,
    );

    try {
      // invoice.payment_succeeded;
      // invoice.payment_failed;
      // customer.subscription.updated;
      // customer.subscription.deleted;
      switch (event.type) {
        case 'invoice.paid':
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
          await this.stripeWebhookService.handleInvoiceUpdates(
            event.type,
            event,
          );
          break;
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.stripeWebhookService.handleSubscriptionUpdates(
            event.type,
            event,
          );
          break;
        default:
          this.logger.log(`Unhandled event type: ${event.type}`);

          break;
      }
    } catch (error) {
      this.logger.error(
        `Error processing event ${event.id} (type: ${event.type}): ${error.message}`,
        error.stack,
      );

      throw new BadRequestException(
        `Error processing webhook event ${event.type}: ${error.message}`,
      );
    }
  }
}
