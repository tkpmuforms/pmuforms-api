import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStripeSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  priceId: string;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;
}

export class AddStripePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;
}

export class ChangeSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  newPriceId: string;

  @IsString()
  @IsOptional()
  paymentMethodId: string;
}

export class DetachStripePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;
}
