import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { Public } from 'src/auth/decorator';

@Controller('api/subscriptions')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Public()
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
