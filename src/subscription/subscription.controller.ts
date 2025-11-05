import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { GetUser, Public } from 'src/auth/decorator';
import { RevenueCatWebhookGuard } from './revcat-webhook.guard';
import {
  AddStripePaymentMethodDto,
  ChangeSubscriptionPlanDto,
  CreateStripeSubscriptionDto,
  DetachStripePaymentMethodDto,
} from './dto';

@Controller('api/subscriptions')
export class SubscriptionController {
  private logger = new Logger(SubscriptionController.name);
  constructor(private subscriptionService: SubscriptionService) {}

  @Public()
  @UseGuards(RevenueCatWebhookGuard)
  @Post('/revenue-cat/webhook')
  async handleRevenueCatSubscription(@Body() payload: any) {
    return await this.subscriptionService.handleRevenueCatSubscription(payload);
  }

  @Public()
  @Post('/stripe/webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string, // Get the Stripe signature from headers
    @Req() request: RawBodyRequest<Request>, // Use RawBodyRequest<> to access rawBody
  ) {
    this.logger.log(`Webhook request received. Passing to WebhookService.`);
    await this.subscriptionService.handleStripeWebhookEvent(
      signature,
      request.rawBody,
    );

    return { received: true };
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

  @Post('/stripe/change-subscription-plan')
  async changeSubscripionPlan(
    @GetUser('userId') artistId: string,
    @Body() dto: ChangeSubscriptionPlanDto,
  ) {
    const subscription = await this.subscriptionService.changeSubscriptionPlan(
      artistId,
      dto,
    );

    return subscription;
  }

  @Get('/stripe/subscription-details')
  async getSubscription(@GetUser('userId') artistId: string) {
    const subscription =
      await this.subscriptionService.getSubscription(artistId);

    return subscription;
  }

  @Get('/stripe/list-payment-methods')
  async listPayment(@GetUser('userId') artistId: string) {
    const subscription =
      await this.subscriptionService.listStripePaymentMethods(artistId);

    return subscription;
  }

  @Post('/stripe/add-payment-method')
  async addPaymentMethod(
    @GetUser('userId') artistId: string,
    @Body() dto: AddStripePaymentMethodDto,
  ) {
    const subscription = await this.subscriptionService.addStripePaymentMethod(
      artistId,
      dto,
    );

    return subscription;
  }

  @Post('/stripe/detach-payment-method')
  async detachPaymentMethod(
    @GetUser('userId') artistId: string,
    @Body() dto: DetachStripePaymentMethodDto,
  ) {
    const subscription = await this.subscriptionService.detachPaymentMethod(
      artistId,
      dto,
    );

    return subscription;
  }

  @Get('/stripe/list-transactions')
  async listTransactions(@GetUser('userId') artistId: string) {
    const subscription =
      await this.subscriptionService.listStripeCustomerTransactions(artistId);

    return subscription;
  }

  @Get('/stripe/cancel-subscription')
  async cancelSubscription(@GetUser('userId') artistId: string) {
    const subscription =
      await this.subscriptionService.cancelSubscription(artistId);

    return subscription;
  }
}
