import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { StripeModule } from 'src/stripe/stripe.module';
import { StripeService } from 'src/stripe/stripe.service';

@Module({
  imports: [StripeModule],
  providers: [SubscriptionService, StripeService],
  controllers: [SubscriptionController],
})
export class SubscriptionModule {}
