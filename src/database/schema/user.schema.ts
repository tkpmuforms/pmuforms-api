import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class Service {
  @Prop()
  id: number;

  @Prop()
  service: string;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

@Schema({ timestamps: true })
export class User {
  @Prop()
  userId: string;

  @Prop()
  appStorePurchaseActive: boolean;

  @Prop()
  canSendPromotionEmails: boolean;

  @Prop()
  communicationEmail: string;

  @Prop({ type: Date })
  communicationEmailVerifiedDate: Date;

  @Prop({ required: true })
  email: string;

  @Prop({ type: Date, default: null })
  lastLoggedIn: Date;

  // @Prop() // talked about removing this field and only using app store purchase active
  // isActive: boolean;

  @Prop()
  businessName: string;

  @Prop({ type: [ServiceSchema] })
  services: Service[];

  @Prop()
  fcmToken?: string;

  @Prop()
  signature_url: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
