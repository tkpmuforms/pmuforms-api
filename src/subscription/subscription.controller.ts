import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { GetUser, Public } from 'src/auth/decorator';
import { RevenueCatWebhookGuard } from './revcat-webhook.guard';
import { CreateStripeSubscriptionDto } from './dto';

@Controller('api/subscriptions')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Public()
  @UseGuards(RevenueCatWebhookGuard)
  @Post('/revenue-cat/webhook')
  async handleRevenueCatSubscription(@Body() payload: any) {
    return await this.subscriptionService.handleRevenueCatSubscription(payload);
  }

  @Public()
  @Get('/refresh-subscription-status/:userId')
  async refreshSubscriptionStatus(@Param('userId') userId: string) {
    return await this.subscriptionService.refreshSubscriptionStatus(userId);
  }

  @Post('/stripe/create-subscription')
  async createSubscription(
    @GetUser('userId') artistId: string,
    @Body() dto: CreateStripeSubscriptionDto,
  ) {
    const subscription =
      await this.subscriptionService.createStripeSubscription(artistId, dto);

    return subscription;
  }

  @Post('/stripe/webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string, // Get the Stripe signature from headers
    @Req() request: RawBodyRequest<Request>, // Use RawBodyRequest<Request> to access rawBody
  ) {
    // this.logger.log(`Webhook request received. Passing to WebhookService.`);
    await this.subscriptionService.handleStripeWebhookEvent(
      signature,
      request.rawBody,
    );

    return { received: true };
  }
}
