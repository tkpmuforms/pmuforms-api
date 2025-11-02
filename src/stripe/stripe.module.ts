import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { AppConfigService } from 'src/config/config.service';
import Stripe from 'stripe';

@Module({
  providers: [
    {
      provide: 'STRIPE_CLIENT',
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        new Stripe(config.get('STRIPE_SECRET_KEY'), {
          apiVersion: '2025-10-29.clover',
        }),
    },
    StripeService,
  ],
  exports: ['STRIPE_CLIENT'],
})
export class StripeModule {}
