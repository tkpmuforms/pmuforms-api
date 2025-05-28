import { SetMetadata } from '@nestjs/common';

export const SUBSCRIPTION_KEY = 'SUBCRIPTION_KEY';
export const SubscriptionBlock = () => SetMetadata(SUBSCRIPTION_KEY, true);
