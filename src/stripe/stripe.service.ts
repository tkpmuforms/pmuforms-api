import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';
import { UserDocument } from 'src/database/schema';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  constructor(
    @Inject('STRIPE_CLIENT') private stripe: Stripe,
    private config: AppConfigService,
  ) {}

  async detachPaymentMethod(paymentMethodId: string) {
    try {
      return this.stripe.paymentMethods.detach(paymentMethodId);
    } catch (error: unknown) {
      const message =
        (error as any)?.message ?? 'Error detaching payment method ';
      this.logger.error(`Error detaching payment method: ${error}`);
      throw new BadRequestException(message, {
        cause: error,
        description: 'Error detaching payment method ',
      });
    }
  }

  async attachPaymentMethodToCustomer(
    paymentMethodId: string,
    stripeCustomerId: string,
  ) {
    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });
    } catch (error: unknown) {
      const message =
        (error as any)?.message ?? 'Error attaching payment method to customer';
      this.logger.error(`Error attaching payment method: ${error}`);
      throw new BadRequestException(message, {
        cause: error,
        description: 'Error attaching payment method to customer',
      });
    }
  }

  async updateDefaultPaymentMethod(
    stripeCustomerId: string,
    paymentMethodId: string,
  ) {
    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });
    } catch (error: unknown) {
      const message =
        (error as any)?.message ??
        'Error updating default payment method of customer';
      this.logger.error(`Error updating default payment method: ${error}`);
      throw new BadRequestException(message, {
        cause: error,
        description: 'Error updating default payment method of customer',
      });
    }
  }

  async createStripeCustomer(artist: UserDocument) {
    try {
      const stripeCustomer = await this.stripe.customers.create(
        {
          email: artist.email,
          name: artist.businessName,
          metadata: {
            userId: artist.userId,
          },
        },
        {
          idempotencyKey: `create_stripe_customer_${artist.userId}`,
        },
      );
      return stripeCustomer;
    } catch (error: unknown) {
      this.logger.error(
        `Error creating stripe customer- ${JSON.stringify(error)}`,
      );
      throw new InternalServerErrorException(
        `Unable to create stripe customer`,
        { cause: error },
      );
    }
  }

  async getStripeCustomer(stripeCustomerId: string) {
    try {
      // Fetch customer directly from Stripe
      return await this.stripe.customers.retrieve(stripeCustomerId);
    } catch (error: unknown) {
      const message =
        (error as any)?.message ?? 'Error retrieving customer from Stripe';
      this.logger.error(`Error retrieving customer from Stripe: ${error}`);
      throw new BadRequestException(message, {
        cause: error,
        description: 'Error retrieving customer from Stripe',
      });
    }
  }

  async createStripeSubscription(params: {
    stripeCustomerId: string;
    defaultPaymentMethod?: string;
    items: Stripe.SubscriptionCreateParams['items'];
    expand: Stripe.SubscriptionCreateParams['expand'];
    trialPeriodDays?: number;
    couponId?: string;
  }) {
    try {
      const { stripeCustomerId, items, trialPeriodDays, expand } = params;
      return this.stripe.subscriptions.create({
        customer: stripeCustomerId,
        default_payment_method: params.defaultPaymentMethod,
        items: items,
        trial_period_days: trialPeriodDays,
        discounts: params.couponId ? [{ coupon: params.couponId }] : undefined,
        expand,
      });
    } catch (error: unknown) {
      const message = (error as any)?.message ?? 'Error creating subscription';
      this.logger.error(`Error creating stripe subscription: ${error}`);
      throw new BadRequestException(message, {
        cause: error,
        description: 'Error creating stripe subscription',
      });
    }
  }

  async getSubscription(
    subscriptionId: string,
    options?: { expand: string[] },
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionId,
        options,
      );
      return subscription;
    } catch (error: unknown) {
      const message = (error as any)?.message ?? 'Error getting subscription';
      this.logger.error(`Error getting stripe subscription: ${error}`);
      throw new BadRequestException(message, {
        cause: error,
        description: 'Error getting stripe subscription',
      });
    }
  }

  async updateSubscription(params: {
    subscriptionId: string;
    cancelAtPeriodEnd: boolean;
    prorationBehavior?: Stripe.SubscriptionUpdateParams['proration_behavior'];
    items?: Stripe.SubscriptionUpdateParams['items'];
    couponId?: string;
  }) {
    try {
      const { subscriptionId, cancelAtPeriodEnd, prorationBehavior, items } =
        params;
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
        proration_behavior: prorationBehavior, // handle billing adjustments
        items: items,
        discounts: params.couponId ? [{ coupon: params.couponId }] : undefined,
      });
    } catch (error: unknown) {
      const message = (error as any)?.message ?? 'Error updating subscription';
      this.logger.error(`Error updating stripe subscription: ${error}`);
      throw new BadRequestException(message, {
        cause: error,
        description: 'Error updating stripe subscription',
      });
    }
  }

  async listCustomerPaymentMethods(params: {
    stripeCustomerId: string;
    type: Stripe.PaymentMethodListParams['type'];
  }) {
    try {
      return this.stripe.paymentMethods.list({
        customer: params.stripeCustomerId,
        type: params.type,
      });
    } catch (error: unknown) {
      const message =
        (error as any)?.message ?? 'Error listing stripe customer transactions';
      this.logger.error(`Error creating stripe subscription: ${error}`);
      throw new InternalServerErrorException(message, {
        cause: error,
        description: 'Error listing stripe customer payment methods',
      });
    }
  }

  async listCustomerTransactions(
    params: {
      stripeCustomerId: string;
    },
    { limit = 10, startingAfter }: { limit?: number; startingAfter?: string },
  ) {
    try {
      const { stripeCustomerId } = params;
      return await this.stripe.invoices.list({
        customer: stripeCustomerId,
        limit,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
    } catch (error: unknown) {
      const message =
        (error as any)?.message ?? 'Error listing customer transactions';
      this.logger.error(`Error listing customer transactions: ${error}`);
      throw new InternalServerErrorException(message, {
        cause: error,
        description: 'Error listing stripe customer transactions',
      });
    }
  }

  async listCustomerSubscriptions(
    params: {
      stripeCustomerId: string;
      status: Stripe.SubscriptionListParams['status'];
    },
    options: { limit?: number; startingAfter?: string },
  ) {
    try {
      const { stripeCustomerId, status } = params;
      const { limit = 10, startingAfter } = options;
      return await this.stripe.subscriptions.list({
        customer: stripeCustomerId,
        status,
        limit,
        starting_after: startingAfter,
      });
    } catch (error: unknown) {
      const message =
        (error as any)?.message ?? 'Error listing customer subcripnsons';
      this.logger.error(`Error listing customer subcripnsons: ${error}`);
      throw new InternalServerErrorException(message, {
        cause: error,
        description: 'Error listing customer subcripnsons',
      });
    }
  }

  async constructStripeWebhookEvent(signature: string, rawBody: Buffer) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.get('STRIPE_WEBHOOK_SECRET'),
      );
      this.logger.log(
        `Stripe event constructed successfully: ${event.id}, Type: ${event.type}`,
      );

      return event;
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
        err.stack,
      );
      throw new BadRequestException(
        `Webhook error (signature verification failed): ${err.message}`,
      );
    }
  }

  async getStripeCouponByCode(
    couponCode: string,
  ): Promise<Stripe.Coupon | null> {
    try {
      const promoList = await this.stripe.promotionCodes.list({
        code: couponCode,
        active: true,
        limit: 1,
      });
      const promo = promoList.data[0];

      if (!promo) {
        return null;
      }
      const couponId =
        typeof promo.promotion.coupon === 'string'
          ? promo.promotion.coupon
          : promo.promotion.coupon.id;

      const coupon = await this.stripe.coupons.retrieve(couponId);
      return coupon;
    } catch (error: unknown) {
      if ((error as any)?.type === 'StripeInvalidRequestError') {
        return null;
      }
      const message =
        (error as any)?.message ?? 'Error validating Stripe coupon code';
      this.logger.error(`Error validating Stripe coupon code: ${error}`);
      throw new InternalServerErrorException(message, {
        cause: error,
        description: 'Error validating Stripe coupon code',
      });
    }
  }

  async validateStripeCoupon(
    couponCode: string,
  ): Promise<{ isValid: boolean; message: string }> {
    try {
      const promoList = await this.stripe.promotionCodes.list({
        code: couponCode,
        active: true,
        limit: 1,
      });
      const promo = promoList.data[0];

      if (!promo) {
        this.logger.warn(`Coupon code not found: ${couponCode}`);
        return { isValid: false, message: 'Coupon code not found' };
      }
      const couponId =
        typeof promo.promotion.coupon === 'string'
          ? promo.promotion.coupon
          : promo.promotion.coupon.id;

      const coupon = await this.stripe.coupons.retrieve(couponId);

      // console.log(`Retrieved coupon: ${JSON.stringify(coupon)}`);
      return { isValid: coupon?.valid ?? false, message: 'Coupon is valid' };
    } catch (error: unknown) {
      if ((error as any)?.type === 'StripeInvalidRequestError') {
        // If the error is due to an invalid coupon code, we consider it as invalid

        return { isValid: false, message: (error as any).message };
      }
      const message =
        (error as any)?.message ?? 'Error validating Stripe coupon code';
      this.logger.error(`Error validating Stripe coupon code: ${error}`);
      throw new InternalServerErrorException(message, {
        cause: error,
        description: 'Error validating Stripe coupon code',
      });
    }
  }
}
