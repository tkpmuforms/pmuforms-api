import { RevCatWebhookPayload } from './subscription.types';

type RevenueCatSubscriptionEventPayload = {
  webhookPayload: RevCatWebhookPayload;
};

export class RevenueCatSubcriptionEvent {
  declare payload: RevenueCatSubscriptionEventPayload;
  constructor(payload: RevenueCatSubscriptionEventPayload) {
    this.payload = payload;
  }
}
