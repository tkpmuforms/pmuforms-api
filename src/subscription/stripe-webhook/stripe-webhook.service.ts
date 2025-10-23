import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from 'src/database/schema';
import { StripeService } from 'src/stripe/stripe.service';
import Stripe from 'stripe';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    // @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    @InjectModel('users') private userModel: Model<UserDocument>,
    private readonly stripeService: StripeService,
  ) {}

  // invoice.payment_succeeded;
  // invoice.payment_failed;
  async handleInvoiceUpdates(
    eventType:
      | 'invoice.paid'
      | 'invoice.payment_failed'
      | 'invoice.payment_succeeded',
    event: Stripe.Event,
  ) {
    try {
      const invoice = event.data.object as Stripe.Invoice;

      // Extract useful info
      const stripeCustomerId = invoice.customer;

      if (!stripeCustomerId || typeof stripeCustomerId !== 'string') {
        this.logger.error(
          `'invoice.paid' stripe event- invoice.customer missing.`,
        );
        return;
      }

      this.logger.log(
        `[${eventType}] Processing invoice ${invoice.id} for customer ${stripeCustomerId}`,
      );

      if (eventType === 'invoice.payment_failed') {
        this.logger.warn(
          `[${eventType}] Payment failed for customer ${stripeCustomerId}`,
        );
      }

      const artist = await this.userModel.findOne({ stripeCustomerId });

      if (!artist) {
        this.logger.error(
          `${eventType}- ❌ artist with stripeCustomerId- ${stripeCustomerId} not found `,
        );
        return;
      }

      // get subscription and price id from invoice

      const subscriptionId = invoice.lines?.data?.find(
        (line) => typeof line.subscription === 'string',
      )?.subscription as string | undefined;

      if (!subscriptionId) {
        this.logger.error(
          `${eventType}- ❌ subscription id not found in invoice`,
        );
        return;
      }

      const subscription =
        await this.stripeService.getSubscription(subscriptionId);
      const activePriceId = subscription.items?.data?.[0]?.price?.id;

      if (!activePriceId) {
        this.logger.warn(
          `❌ Subscription ${subscription.id} has no items or item price. Cannot set activeStripePriceId.`,
        );
      }

      await this.userModel.findByIdAndUpdate(artist._id, {
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionActive: ['active', 'trialing'].includes(
          subscription.status,
        ),
        activeStripePriceId: activePriceId ?? undefined,
        stripeLastSyncAt: new Date(),
      });

      return {
        isFistTimeSubscriber:
          subscription.status === 'active' &&
          subscription.billing_cycle_anchor === subscription.start_date,
      };
    } catch (error) {
      this.logger.error(
        `${eventType}- ❌ Unable to process ${eventType} event`,
        error.stack,
      );
      throw error;
    }
  }

  // customer.subscription.updated; // customer.subscription.deleted;
  async handleSubscriptionUpdates(
    eventType:
      | 'customer.subscription.updated'
      | 'customer.subscription.deleted',
    event: Stripe.Event,
  ) {
    this.logger.log(`[${eventType}] Handling subscription webhook`);

    const subscription = event.data.object as Stripe.Subscription;

    if (!subscription.customer || typeof subscription.customer !== 'string') {
      this.logger.error(
        `${eventType} event for subscription ${subscription.id} is missing a valid customer ID.`,
      );
      return;
    }
    const stripeCustomerId = subscription.customer;
    const artist = await this.userModel.findOne({
      stripeCustomerId: stripeCustomerId,
    });

    if (!artist) {
      this.logger.warn(
        `Artist not found for Stripe Customer ID: ${stripeCustomerId} from customer.subscription.updated event ${subscription.id}.`,
      );
      return;
    }
    this.logger.log(
      `[${eventType}] Updating artist ${artist._id} for subscription ${subscription.id}`,
    );

    if (eventType === 'customer.subscription.deleted') {
      await this.userModel.updateOne(
        { stripeCustomerId: stripeCustomerId },
        {
          $set: {
            stripeSubscriptionId: null,
            activeStripePriceId: null,
            stripeSubscriptionActive: false,
            stripeLastSyncAt: new Date(),
          },
        },
      );
      return;
    }

    const updateData: Partial<UserDocument> = {
      stripeSubscriptionId: subscription.id,
      activeStripePriceId:
        subscription.items &&
        subscription.items.data &&
        subscription.items.data.length > 0 &&
        subscription.items.data[0].price
          ? subscription.items.data[0].price.id
          : null,
      stripeLastSyncAt: new Date(),
    };

    // Handle subscription status and active state based on cancellation status
    if (subscription.status === 'canceled') {
      // Subscription is fully canceled
      updateData.stripeSubscriptionActive = false;
      updateData.stripeSubscriptionId = null;
      updateData.activeStripePriceId = null;
    } else if (subscription.cancel_at_period_end) {
      // Subscription is scheduled for cancellation but still active
      updateData.stripeSubscriptionActive = ['active', 'trialing'].includes(
        subscription.status,
      );

      this.logger.log(
        `Subscription ${subscription.id} is scheduled for cancellation at period end (${new Date(subscription?.items?.data[0]?.current_period_end * 1000).toISOString()}) but remains active until then.`,
      );
    } else {
      // Normal subscription logic (not scheduled for cancellation and not canceled)
      updateData.stripeSubscriptionActive = ['active', 'trialing'].includes(
        subscription.status,
      );
    }

    await this.userModel.updateOne(
      { stripeCustomerId: stripeCustomerId },
      { $set: updateData },
    );
    this.logger.log(
      `Artist ${artist.userId} updated for customer.subscription.updated event.`,
    );
  }
}
