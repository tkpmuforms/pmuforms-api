import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { StripeModule } from 'src/stripe/stripe.module';
import { StripeService } from 'src/stripe/stripe.service';
import { StripeWebhookService } from './stripe-webhook/stripe-webhook.service';

@Module({
  imports: [StripeModule],
  providers: [SubscriptionService, StripeService, StripeWebhookService],
  controllers: [SubscriptionController],
})
export class SubscriptionModule {}
