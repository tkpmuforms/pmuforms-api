import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: false })
class Service {
  @Prop()
  id: number;

  @Prop()
  service: string;
}

@Schema({ _id: false })
export class Profile {
  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  phoneNumber: string;

  @Prop()
  avatarUrl?: string;
}

@Schema({ timestamps: true })
class User {
  @Prop()
  userId: string;

  @Prop({ default: false })
  appStorePurchaseActive: boolean;

  @Prop({ type: Date })
  subscriptionLastVerifiedDate: Date;

  @Prop()
  canSendPromotionEmails: boolean;

  @Prop()
  communicationEmail: string;

  @Prop({ type: Date })
  communicationEmailVerifiedDate: Date;

  @Prop({ required: true })
  email: string;

  @Prop()
  emailVerified: boolean;

  @Prop({ type: Date, default: null })
  lastLoggedIn: Date;

  // @Prop() // talked about removing this field and only using app store purchase active
  // isActive: boolean;

  @Prop()
  businessName: string;

  @Prop()
  businessUri: string;

  @Prop({ type: [Service], default: [] })
  services: Service[];

  @Prop()
  fcmToken?: string;

  @Prop()
  signature_url?: string;

  @Prop()
  website?: string;

  @Prop()
  defaultStripePaymentMethod?: string;

  @Prop({ unique: true })
  stripeCustomerId: string;

  @Prop({ default: false })
  stripeSubsctiptionActive: boolean;

  @Prop({ unique: true })
  activeStripePriceId?: string;

  @Prop({ unique: true })
  stripeSubscriptionId?: string;

  @Prop({ type: Profile })
  profile: Profile;
}

export const UserSchema = SchemaFactory.createForClass(User);
