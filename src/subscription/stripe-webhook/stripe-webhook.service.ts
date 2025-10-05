import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from 'src/database/schema';
import { StripeService } from 'src/stripe/stripe.service';
import Stripe from 'stripe';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    @InjectModel('users') private userModel: Model<UserDocument>,
    private readonly stripeService: StripeService,
  ) {}

  async handleInvoicePaid(eventType: 'invoice.paid', event: Stripe.Event) {
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
        stripeSubsctiptionActive: ['active', 'trialing'].includes(
          subscription.status,
        ),
        activeStripePriceId: activePriceId ?? undefined,
        stripeLastSyncAt: new Date(),
      });

      return { isFistTimeSubscriber: subscription.status === 'trialing' };
    } catch (error) {
      this.logger.error(
        `${eventType}- ❌ Unable to process ${eventType} event`,
        error.stack,
      );
      throw error;
    }
  }
}
