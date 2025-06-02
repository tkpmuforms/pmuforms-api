import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { Public } from 'src/auth/decorator';
import { RevenueCatWebhookGuard } from './revcat-webhook.guard';

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
}
