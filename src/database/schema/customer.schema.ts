import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema()
export class Service {
  @Prop()
  id: number;

  @Prop()
  service: string;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

@Schema({ timestamps: true })
export class Customer {
  @Prop()
  appStorePurchaseActive: boolean;

  @Prop({ required: true })
  businessName: string;

  @Prop()
  clients: string[];

  @Prop()
  email: string;

  @Prop()
  isActive: boolean;

  @Prop({ type: Date, default: null })
  lastLoggedIn: Date;

  @Prop({ type: [ServiceSchema] })
  services: Service[];

  @Prop()
  userId: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
